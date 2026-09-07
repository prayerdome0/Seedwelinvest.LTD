import Link from 'next/link';
import { FileText, Inbox } from 'lucide-react';
import { PageHeader, Panel, StatCard } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Section';
import { formatDate } from '@/lib/utils';
import { APPLICATION_STATUS_LABELS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const STAGE_ORDER = ['new', 'under_review', 'shortlisted', 'interview', 'approved', 'invitation_sent', 'registration', 'onboarding', 'accepted'];

export default async function MyApplicationsPage() {
  const user = await requireUser('/dashboard/my-applications');

  const applications = queryAll<{
    id: number;
    reference: string;
    job_title: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT a.id, a.reference, j.title AS job_title, a.status, a.created_at, a.updated_at
       FROM applications a LEFT JOIN jobs j ON j.id = a.job_id
      WHERE (a.user_id = ? OR a.email = ?)
      ORDER BY a.created_at DESC`,
    [user.id, user.email],
  );

  const events = queryAll<{ application_id: number; from_status: string; to_status: string; note: string; created_at: string }>(
    `SELECT e.application_id, e.from_status, e.to_status, e.note, e.created_at
       FROM application_events e
      WHERE e.application_id IN (SELECT id FROM applications WHERE user_id = ? OR email = ?)
      ORDER BY e.created_at DESC LIMIT 40`,
    [user.id, user.email],
  );

  const eventsByApp = events.reduce<Record<number, typeof events>>((acc, e) => {
    acc[e.application_id] = acc[e.application_id] || [];
    acc[e.application_id].push(e);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="My applications" subtitle="The roles you have applied for and where you are in the process." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Applications" value={applications.length} icon={<FileText size={18} />} />
        <StatCard label="In progress" value={applications.filter((a) => !['accepted', 'rejected', 'archived'].includes(a.status)).length} tone="navy" icon={<Inbox size={18} />} />
        <StatCard label="Successful" value={applications.filter((a) => a.status === 'accepted').length} tone="success" icon={<FileText size={18} />} />
      </div>

      <div className="mt-6 space-y-5">
        {applications.length === 0 ? (
          <Panel>
            <EmptyState
              title="No applications yet"
              description="When you apply for a role, you can follow its progress here."
              action={
                <Link href="/careers" className="inline-flex items-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
                  View open roles
                </Link>
              }
            />
          </Panel>
        ) : (
          applications.map((application) => {
            const stageIndex = STAGE_ORDER.indexOf(application.status);
            const history = eventsByApp[application.id] ?? [];
            return (
              <Panel
                key={application.id}
                title={application.job_title || 'Talent pool'}
                subtitle={`Reference ${application.reference} · submitted ${formatDate(application.created_at)}`}
                action={<StatusPill status={application.status} label={APPLICATION_STATUS_LABELS[application.status]} />}
              >
                <div className="overflow-x-auto">
                  <ol className="flex min-w-[560px] items-center gap-1">
                    {STAGE_ORDER.map((stage, i) => {
                      const reached = stageIndex >= i;
                      const current = stageIndex === i;
                      return (
                        <li key={stage} className="flex flex-1 items-center gap-1">
                          <div className="flex-1">
                            <div className={`h-1.5 rounded-full ${reached ? 'bg-navy-900' : 'bg-navy-100'}`} />
                            <p className={`mt-1.5 text-2xs ${current ? 'font-semibold text-navy-900' : reached ? 'text-navy-600' : 'text-navy-400'}`}>
                              {APPLICATION_STATUS_LABELS[stage]}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {history.length > 0 && (
                  <ul className="mt-5 space-y-2 border-t border-navy-100 pt-4">
                    {history.slice(0, 5).map((event, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-2 text-xs text-navy-600">
                        <span className="text-navy-400">{formatDate(event.created_at)}</span>
                        <span className="font-medium text-navy-800">
                          {event.to_status ? APPLICATION_STATUS_LABELS[event.to_status] ?? event.to_status : 'Note'}
                        </span>
                        {event.note && <span className="text-navy-500">— {event.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })
        )}
      </div>

      <p className="mt-6 text-xs text-navy-500">
        Questions about an application?{' '}
        <Link href="/contact" className="font-medium text-brand-600 hover:text-brand-700">
          Contact our recruitment team
        </Link>
        . We never charge a fee at any stage.
      </p>
    </>
  );
}
