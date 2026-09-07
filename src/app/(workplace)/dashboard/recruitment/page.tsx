import Link from 'next/link';
import { PageHeader, Panel, Pagination, EmptyRow, FilterBar, FilterField, TableWrap, StatCard } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { StatusPill } from '@/components/ui/Badge';
import { timeAgo, formatDate } from '@/lib/utils';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const PER_PAGE = 20;

export default async function RecruitmentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission('applications.view', '/dashboard/recruitment');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const status = params.status || '';
  const job = params.job || '';
  const q = (params.q || '').trim();

  const where: string[] = [];
  const args: unknown[] = [];
  if (status) {
    where.push('a.status = ?');
    args.push(status);
  }
  if (job) {
    where.push('a.job_id = ?');
    args.push(Number(job));
  }
  if (q) {
    where.push('(a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ? OR a.skills LIKE ?)');
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM applications a ${whereSql}`, args)?.c ?? 0;

  const applications = queryAll<{
    id: number;
    reference: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    created_at: string;
    job_title: string | null;
    cv_path: string | null;
    rating: number;
  }>(
    `SELECT a.id, a.reference, TRIM(a.first_name || ' ' || a.last_name) AS name, a.email, a.phone, a.status,
            a.created_at, j.title AS job_title, a.cv_path, a.rating
       FROM applications a LEFT JOIN jobs j ON j.id = a.job_id
       ${whereSql}
      ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (page - 1) * PER_PAGE],
  );

  const jobs = queryAll<{ id: number; title: string }>('SELECT id, title FROM jobs ORDER BY title');

  const pipeline = queryAll<{ status: string; c: number }>('SELECT status, COUNT(*) AS c FROM applications GROUP BY status');
  const countFor = (s: string) => pipeline.find((p) => p.status === s)?.c ?? 0;
  const totalActive = pipeline.filter((p) => !['accepted', 'rejected', 'archived'].includes(p.status)).reduce((sum, p) => sum + p.c, 0);

  return (
    <>
      <PageHeader
        title="Recruitment"
        subtitle={`${totalActive} candidate${totalActive === 1 ? '' : 's'} in the active pipeline`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/recruitment/jobs" className="inline-flex items-center rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
              Job openings
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New" value={countFor('new')} hint="Not yet reviewed" />
        <StatCard label="Shortlisted" value={countFor('shortlisted')} />
        <StatCard label="Interviews" value={countFor('interview')} />
        <StatCard label="Invitations sent" value={countFor('invitation_sent')} tone="gold" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/dashboard/recruitment" className={`chip ${!status ? 'border-navy-900 bg-navy-900 text-white' : ''}`}>
          All {pipeline.reduce((sum, p) => sum + p.c, 0)}
        </Link>
        {APPLICATION_STATUSES.filter((s) => countFor(s) > 0).map((s) => (
          <Link key={s} href={`/dashboard/recruitment?status=${s}`} className={`chip ${status === s ? 'border-navy-900 bg-navy-900 text-white' : ''}`}>
            {APPLICATION_STATUS_LABELS[s]} {countFor(s)}
          </Link>
        ))}
      </div>

      <FilterBar className="mt-5">
        <FilterField label="Search">
          <input name="q" defaultValue={q} placeholder="Name, email or skill…" className="field-input" />
        </FilterField>
        <FilterField label="Vacancy">
          <select name="job" defaultValue={job} className="field-input">
            <option value="">All vacancies</option>
            {jobs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Stage">
          <select name="status" defaultValue={status} className="field-input">
            <option value="">Any stage</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <button type="submit" className="inline-flex h-[42px] items-center rounded-xl bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800">
          Filter
        </button>
        {(q || job || status) && (
          <Link href="/dashboard/recruitment" className="inline-flex h-[42px] items-center rounded-xl border border-navy-200 px-4 text-sm text-navy-700 hover:bg-navy-50">
            Clear
          </Link>
        )}
      </FilterBar>

      <Panel padded={false}>
        <TableWrap className="rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Candidate</th>
                <th>Vacancy</th>
                <th>Stage</th>
                <th>CV</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <Link href={`/dashboard/recruitment/applications/${application.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                      {application.reference}
                    </Link>
                  </td>
                  <td>
                    <span className="block font-medium text-navy-900">{application.name}</span>
                    <span className="block text-xs text-navy-500">{application.email}</span>
                  </td>
                  <td className="text-xs text-navy-600">{application.job_title || 'Talent pool'}</td>
                  <td>
                    <StatusPill status={application.status} label={APPLICATION_STATUS_LABELS[application.status]} />
                  </td>
                  <td className="text-xs">
                    {application.cv_path ? (
                      <a href={`/api/files/${application.cv_path}`} className="font-medium text-brand-600 hover:text-brand-700">
                        View CV
                      </a>
                    ) : (
                      <span className="text-navy-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-xs text-navy-500">{timeAgo(application.created_at)}</td>
                </tr>
              ))}
              {applications.length === 0 && <EmptyRow colSpan={6}>No applications match these filters.</EmptyRow>}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <Pagination page={page} perPage={PER_PAGE} total={total} basePath="/dashboard/recruitment" params={{ status, job, q }} />

      <p className="mt-4 text-xs text-navy-500">
        Showing {applications.length} of {total} applications · {formatDate(new Date().toISOString().slice(0, 10))}
      </p>
    </>
  );
}
