import Link from 'next/link';
import { Briefcase, Plus } from 'lucide-react';
import { PageHeader, Panel, EmptyRow, TableWrap } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { InlineActionForm } from '@/components/dashboard/forms';
import { setJobStatusAction, deleteJobAction } from '@/app/actions/recruitment';
import { JobForm } from '@/components/dashboard/JobForm';

export const dynamic = 'force-dynamic';

export default async function JobsAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  await requirePermission('jobs.manage', '/dashboard/recruitment/jobs');
  const params = await searchParams;
  const editingId = Number(params.edit || 0);

  const jobs = queryAll<{
    id: number;
    slug: string;
    title: string;
    department: string;
    employment_type: string;
    location: string;
    remote_status: string;
    salary_min: number | null;
    salary_max: number | null;
    salary_currency: string;
    salary_visible: number;
    positions: number;
    deadline: string | null;
    status: string;
    is_featured: number;
    applicant_count: number;
    created_at: string;
    summary: string;
    description: string;
    responsibilities: string;
    requirements: string;
    skills: string;
  }>(
    `SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
       FROM jobs j ORDER BY CASE j.status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 WHEN 'closed' THEN 2 ELSE 3 END, j.created_at DESC`,
  );

  const editing = editingId ? jobs.find((job) => job.id === editingId) : undefined;
  const isNew = params.new === '1';

  if (isNew || editing) {
    return (
      <>
        <PageHeader
          title={editing ? 'Edit vacancy' : 'New vacancy'}
          subtitle={
            editing
              ? `${editing.title} · ${editing.applicant_count} application${editing.applicant_count === 1 ? '' : 's'}`
              : 'Publish a role and start receiving applications on the careers page.'
          }
          breadcrumb={[{ label: 'Recruitment', href: '/dashboard/recruitment' }, { label: 'Job openings', href: '/dashboard/recruitment/jobs' }, { label: editing ? 'Edit' : 'New' }]}
          actions={
            <Link href="/dashboard/recruitment/jobs" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
              Back to vacancies
            </Link>
          }
        />
        <div className="max-w-3xl">
          <JobForm
            mode={editing ? 'edit' : 'create'}
            defaults={
              editing
                ? {
                    id: editing.id,
                    title: editing.title,
                    department: editing.department,
                    employment_type: editing.employment_type,
                    location: editing.location,
                    remote_status: editing.remote_status,
                    salary_min: editing.salary_min,
                    salary_max: editing.salary_max,
                    salary_currency: editing.salary_currency,
                    salary_visible: editing.salary_visible,
                    positions: editing.positions,
                    summary: editing.summary,
                    description: editing.description,
                    responsibilities: editing.responsibilities,
                    requirements: editing.requirements,
                    skills: editing.skills,
                    deadline: editing.deadline,
                    status: editing.status,
                    is_featured: editing.is_featured,
                  }
                : undefined
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Job openings"
        subtitle="Add, edit, publish, unpublish, close, reopen, archive or delete vacancies. The public careers page updates automatically."
        breadcrumb={[{ label: 'Recruitment', href: '/dashboard/recruitment' }, { label: 'Job openings' }]}
        actions={
          <Link href="/dashboard/recruitment/jobs?new=1" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            <Plus size={16} aria-hidden /> New vacancy
          </Link>
        }
      />

      <Panel padded={false}>
        <TableWrap className="rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vacancy</th>
                <th>Status</th>
                <th>Applicants</th>
                <th>Closing date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link href={`/dashboard/recruitment/jobs?edit=${job.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                      {job.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-navy-500">
                      {job.department || '—'} · {job.location} · {job.employment_type}
                      {job.is_featured ? ' · featured' : ''}
                    </p>
                  </td>
                  <td>
                    <Badge
                      tone={
                        job.status === 'published'
                          ? 'success'
                          : job.status === 'draft'
                            ? 'neutral'
                            : job.status === 'closed'
                              ? 'warning'
                              : 'neutral'
                      }
                    >
                      {job.status}
                    </Badge>
                  </td>
                  <td className="text-xs text-navy-600">{job.applicant_count}</td>
                  <td className="whitespace-nowrap text-xs text-navy-600">{job.deadline ? formatDate(job.deadline) : 'Open until filled'}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {job.status !== 'published' && (
                        <InlineActionForm action={setJobStatusAction} fields={{ id: job.id, status: 'published' }} label="Publish" variant="ghost" />
                      )}
                      {job.status === 'published' && (
                        <InlineActionForm action={setJobStatusAction} fields={{ id: job.id, status: 'closed' }} label="Close" variant="ghost" />
                      )}
                      {job.status === 'published' && (
                        <InlineActionForm action={setJobStatusAction} fields={{ id: job.id, status: 'draft' }} label="Unpublish" variant="ghost" />
                      )}
                      {job.status === 'closed' && (
                        <InlineActionForm action={setJobStatusAction} fields={{ id: job.id, status: 'published' }} label="Reopen" variant="ghost" />
                      )}
                      {job.status !== 'archived' && (
                        <InlineActionForm action={setJobStatusAction} fields={{ id: job.id, status: 'archived' }} label="Archive" variant="ghost" />
                      )}
                      <InlineActionForm
                        action={deleteJobAction}
                        fields={{ id: job.id }}
                        label="Delete"
                        confirm={`Delete “${job.title}”? Applications are kept but will no longer be linked to a vacancy.`}
                        variant="ghost"
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <EmptyRow colSpan={5}>
                  <span className="inline-flex items-center gap-2">
                    <Briefcase size={16} aria-hidden /> No vacancies yet.{' '}
                    <Link href="/dashboard/recruitment/jobs?new=1" className="font-medium text-brand-600">
                      Create the first one
                    </Link>
                    .
                  </span>
                </EmptyRow>
              )}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </>
  );
}
