import Link from 'next/link';
import { PageHeader, Panel, Pagination, EmptyRow, FilterBar, FilterField, TableWrap, StatCard } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { StatusPill } from '@/components/ui/Badge';
import { formatDate, timeAgo } from '@/lib/utils';
import { SERVICE_REQUEST_STATUSES, SERVICE_REQUEST_STATUS_LABELS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const PER_PAGE = 20;

export default async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission('service_requests.view', '/dashboard/service-requests');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const status = params.status || '';
  const q = (params.q || '').trim();

  const where: string[] = [];
  const args: unknown[] = [];
  if (status) {
    where.push('r.status = ?');
    args.push(status);
  }
  if (q) {
    where.push('(r.name LIKE ? OR r.email LIKE ? OR r.description LIKE ? OR r.reference LIKE ?)');
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM service_requests r ${whereSql}`, args)?.c ?? 0;

  const requests = queryAll<{
    id: number;
    reference: string;
    name: string;
    company: string;
    email: string;
    status: string;
    service: string | null;
    created_at: string;
    assigned_name: string | null;
  }>(
    `SELECT r.id, r.reference, r.name, r.company, r.email, r.status, s.name AS service, r.created_at,
            (SELECT TRIM(first_name || ' ' || last_name) FROM users u WHERE u.id = r.assigned_to) AS assigned_name
       FROM service_requests r LEFT JOIN services s ON s.id = r.service_id
       ${whereSql}
      ORDER BY CASE r.status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 WHEN 'assigned' THEN 2 WHEN 'in_progress' THEN 3 ELSE 4 END,
               r.created_at DESC
      LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (page - 1) * PER_PAGE],
  );

  const counts = queryAll<{ status: string; c: number }>('SELECT status, COUNT(*) AS c FROM service_requests GROUP BY status');
  const countFor = (s: string) => counts.find((c) => c.status === s)?.c ?? 0;
  const open = counts.filter((c) => !['completed', 'rejected', 'cancelled'].includes(c.status)).reduce((sum, c) => sum + c.c, 0);

  return (
    <>
      <PageHeader title="Service requests" subtitle={`${open} open request${open === 1 ? '' : 's'} from the website`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New" value={countFor('new')} href="/dashboard/service-requests?status=new" />
        <StatCard label="In progress" value={countFor('in_progress')} tone="navy" href="/dashboard/service-requests?status=in_progress" />
        <StatCard label="Review" value={countFor('review')} tone="gold" />
        <StatCard label="Completed" value={countFor('completed')} tone="success" href="/dashboard/service-requests?status=completed" />
      </div>

      <FilterBar className="mt-5">
        <FilterField label="Search">
          <input name="q" defaultValue={q} placeholder="Reference, name or email…" className="field-input" />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status} className="field-input">
            <option value="">All statuses</option>
            {SERVICE_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_REQUEST_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <button type="submit" className="inline-flex h-[42px] items-center rounded-xl bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800">
          Filter
        </button>
      </FilterBar>

      <Panel padded={false}>
        <TableWrap className="rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>From</th>
                <th>Service</th>
                <th>Assigned to</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <Link href={`/dashboard/service-requests/${request.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                      {request.reference}
                    </Link>
                  </td>
                  <td>
                    <span className="block font-medium text-navy-900">{request.name}</span>
                    <span className="block text-xs text-navy-500">{request.company || request.email}</span>
                  </td>
                  <td className="text-xs text-navy-600">{request.service || '—'}</td>
                  <td className="text-xs text-navy-600">{request.assigned_name || 'Unassigned'}</td>
                  <td>
                    <StatusPill status={request.status} label={SERVICE_REQUEST_STATUS_LABELS[request.status]} />
                  </td>
                  <td className="whitespace-nowrap text-xs text-navy-500">{timeAgo(request.created_at)}</td>
                </tr>
              ))}
              {requests.length === 0 && <EmptyRow colSpan={6}>No service requests found.</EmptyRow>}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <Pagination page={page} perPage={PER_PAGE} total={total} basePath="/dashboard/service-requests" params={{ status, q }} />
      <p className="mt-4 text-xs text-navy-500">Requests submitted on {formatDate(new Date().toISOString().slice(0, 10))} and earlier.</p>
    </>
  );
}
