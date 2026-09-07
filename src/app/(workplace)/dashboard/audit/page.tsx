import { PageHeader, Panel, Pagination, EmptyRow, FilterBar, FilterField, TableWrap } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const PER_PAGE = 40;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission('audit.view', '/dashboard/audit');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const q = (params.q || '').trim();
  const action = params.action || '';

  const where: string[] = [];
  const args: unknown[] = [];
  if (action) {
    where.push('l.action LIKE ?');
    args.push(`${action}%`);
  }
  if (q) {
    where.push('(l.actor_name LIKE ? OR l.entity_label LIKE ? OR l.action LIKE ? OR l.ip LIKE ?)');
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM audit_logs l ${whereSql}`, args)?.c ?? 0;

  const logs = queryAll<{
    id: number;
    actor_name: string;
    action: string;
    entity_type: string;
    entity_id: number | null;
    entity_label: string;
    field: string;
    previous_value: string | null;
    new_value: string | null;
    ip: string | null;
    created_at: string;
  }>(
    `SELECT l.id, l.actor_name, l.action, l.entity_type, l.entity_id, l.entity_label, l.field,
            l.previous_value, l.new_value, l.ip, l.created_at
       FROM audit_logs l ${whereSql} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (page - 1) * PER_PAGE],
  );

  const actions = queryAll<{ action: string }>('SELECT DISTINCT action FROM audit_logs ORDER BY action');

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every significant action in Seedwel Workplace, with who did it and when."
      />

      <FilterBar>
        <FilterField label="Search">
          <input name="q" defaultValue={q} placeholder="Person, record or IP…" className="field-input" />
        </FilterField>
        <FilterField label="Action">
          <select name="action" defaultValue={action} className="field-input">
            <option value="">All actions</option>
            {actions.map((item) => (
              <option key={item.action} value={item.action}>
                {item.action}
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
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Record</th>
                <th>Change</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs text-navy-500">{formatDateTime(log.created_at)}</td>
                  <td className="text-xs font-medium text-navy-800">{log.actor_name || 'System'}</td>
                  <td className="text-xs text-navy-700">{log.action}</td>
                  <td className="max-w-[200px] truncate text-xs text-navy-600">
                    {log.entity_type}
                    {log.entity_label ? ` · ${log.entity_label}` : ''}
                    {log.entity_id ? ` #${log.entity_id}` : ''}
                  </td>
                  <td className="max-w-[280px] truncate text-xs text-navy-600">
                    {log.field ? (
                      <>
                        <span className="font-medium text-navy-800">{log.field}</span>: {log.previous_value || '—'} →{' '}
                        {log.new_value || '—'}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap text-xs text-navy-400">{log.ip || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && <EmptyRow colSpan={6}>No audit entries found.</EmptyRow>}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <Pagination page={page} perPage={PER_PAGE} total={total} basePath="/dashboard/audit" params={{ q, action }} />
    </>
  );
}
