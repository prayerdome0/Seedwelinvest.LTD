import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText, GraduationCap, Mail, MapPin, Phone, Send, Star } from 'lucide-react';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { StatusPill } from '@/components/ui/Badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, ROLE_KEYS, roleLabel } from '@/lib/rbac';
import { ApplicationActions } from '@/components/dashboard/ApplicationActions';
import { InviteCandidateForm } from '@/components/dashboard/InviteCandidateForm';

export const dynamic = 'force-dynamic';

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('applications.view', '/dashboard/recruitment');
  const { id } = await params;
  const applicationId = Number(id);

  const application = queryOne<{
    id: number;
    reference: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country: string;
    location: string;
    education: string;
    experience: string;
    skills: string;
    cover_letter: string;
    portfolio_url: string;
    cv_path: string | null;
    additional_info: string;
    status: string;
    rating: number;
    notes: string;
    source: string;
    created_at: string;
    updated_at: string;
    job_id: number | null;
    job_title: string | null;
    user_id: number | null;
    reviewed_by: number | null;
    reviewer_name: string | null;
  }>(
    `SELECT a.*, j.title AS job_title,
            (SELECT TRIM(first_name || ' ' || last_name) FROM users u WHERE u.id = a.reviewed_by) AS reviewer_name
       FROM applications a LEFT JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`,
    [applicationId],
  );

  if (!application) notFound();

  const events = queryAll<{ id: number; from_status: string; to_status: string; note: string; actor_name: string; created_at: string }>(
    'SELECT id, from_status, to_status, note, actor_name, created_at FROM application_events WHERE application_id = ? ORDER BY created_at DESC',
    [applicationId],
  );

  const interviews = queryAll<{ id: number; scheduled_at: string; mode: string; location: string; notes: string }>(
    'SELECT id, scheduled_at, mode, location, notes FROM interviews WHERE application_id = ? ORDER BY scheduled_at DESC',
    [applicationId],
  );

  const staff = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' AND role_key NOT IN ('client','applicant') ORDER BY first_name",
  );

  const skills = application.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <PageHeader
        title={`${application.first_name} ${application.last_name}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={application.status} label={APPLICATION_STATUS_LABELS[application.status]} />
            <span>{application.job_title || 'Talent pool'}</span>
            <span className="text-navy-400">· {application.reference}</span>
          </span>
        }
        breadcrumb={[{ label: 'Recruitment', href: '/dashboard/recruitment' }, { label: application.reference }]}
        actions={
          <Link href="/dashboard/recruitment" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
            Back to pipeline
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Panel title="Application" subtitle={`Received ${formatDateTime(application.created_at)} · ${application.source}`}>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                { label: 'Email', value: application.email, icon: Mail },
                { label: 'Phone', value: application.phone, icon: Phone },
                { label: 'Location', value: `${application.location || '—'}${application.country ? `, ${application.country}` : ''}`, icon: MapPin },
                { label: 'Education', value: application.education || '—', icon: GraduationCap },
                { label: 'Experience', value: application.experience || '—', icon: FileText },
                { label: 'Portfolio', value: application.portfolio_url || '—', icon: FileText },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-500">
                    <row.icon size={13} aria-hidden /> {row.label}
                  </dt>
                  <dd className="mt-0.5 break-words text-navy-800">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 border-t border-navy-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Cover letter</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy-700">{application.cover_letter}</p>
            </div>

            {skills.length > 0 && (
              <div className="mt-5 border-t border-navy-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {application.additional_info && (
              <div className="mt-5 border-t border-navy-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Additional information</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy-700">{application.additional_info}</p>
              </div>
            )}

            {application.cv_path && (
              <div className="mt-5 border-t border-navy-100 pt-4">
                <a
                  href={`/api/files/${application.cv_path}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
                >
                  <FileText size={15} aria-hidden /> Download CV
                </a>
                <p className="mt-2 text-2xs text-navy-500">
                  Stored privately. Access is limited to recruitment staff and managers.
                </p>
              </div>
            )}
          </Panel>

          <Panel title="History">
            {events.length === 0 ? (
              <p className="text-sm text-navy-500">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="border-l-2 border-navy-100 pl-3">
                    <p className="text-sm font-medium text-navy-900">
                      {event.to_status
                        ? `${event.from_status ? `${APPLICATION_STATUS_LABELS[event.from_status] ?? event.from_status} → ` : ''}${
                            APPLICATION_STATUS_LABELS[event.to_status] ?? event.to_status
                          }`
                        : 'Note'}
                    </p>
                    {event.note && <p className="mt-0.5 text-xs leading-relaxed text-navy-600">{event.note}</p>}
                    <p className="mt-0.5 text-2xs text-navy-400">
                      {event.actor_name || 'System'} · {formatDateTime(event.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <ApplicationActions
            applicationId={applicationId}
            currentStatus={application.status}
            statuses={APPLICATION_STATUSES.map((s) => ({ value: s, label: APPLICATION_STATUS_LABELS[s] }))}
            notes={application.notes}
            rating={application.rating}
            reviewer={application.reviewer_name}
          />

          <InviteCandidateForm
            applicationId={applicationId}
            roles={ROLE_KEYS.filter((k) => !['client', 'applicant'].includes(k)).map((key) => ({ key, name: roleLabel(key) }))}
            managers={staff}
            defaultJobTitle={application.job_title || ''}
          />

          <Panel title="Interviews">
            {interviews.length > 0 && (
              <ul className="mb-4 space-y-2 border-b border-navy-100 pb-4">
                {interviews.map((interview) => (
                  <li key={interview.id} className="rounded-xl border border-navy-100 p-3">
                    <p className="text-sm font-medium text-navy-900">{formatDateTime(interview.scheduled_at)}</p>
                    <p className="text-xs text-navy-600">
                      {interview.mode}
                      {interview.location ? ` · ${interview.location}` : ''}
                    </p>
                    {interview.notes && <p className="mt-1 text-xs text-navy-500">{interview.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Candidate details">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-navy-500">Application ID</dt>
                <dd className="text-navy-800">{application.id}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-navy-500">Last updated</dt>
                <dd className="text-navy-800">{formatDate(application.updated_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-navy-500">Rating</dt>
                <dd className="flex items-center gap-1 text-navy-800">
                  {application.rating > 0 ? (
                    <>
                      {application.rating} <Star size={13} className="text-gold-400" aria-hidden />
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              {application.user_id && (
                <div className="flex justify-between gap-3">
                  <dt className="text-navy-500">Account</dt>
                  <dd>
                    <Link href={`/dashboard/users/${application.user_id}`} className="font-medium text-brand-600 hover:text-brand-700">
                      View profile
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            <a
              href={`mailto:${application.email}`}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50"
            >
              <Mail size={15} aria-hidden /> Email candidate
            </a>
            <a
              href={`https://wa.me/${application.phone.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50"
            >
              <Send size={15} aria-hidden /> Message on WhatsApp
            </a>
          </Panel>
        </div>
      </div>
    </>
  );
}

