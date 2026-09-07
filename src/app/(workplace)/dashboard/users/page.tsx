import Link from 'next/link';
import { PageHeader, Panel, Pagination, EmptyRow, FilterBar, FilterField, TableWrap } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { ROLE_DEFINITIONS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const PER_PAGE = 25;

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission('users.view', '/dashboard/users');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const q = (params.q || '').trim();
  const role = params.role || '';
  const status = params.status || '';
  const department = params.department || '';

  const where: string[] = [];
  const args: unknown[] = [];
  if (q) {
    where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.job_title LIKE ?)');
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (role) {
    where.push('u.role_key = ?');
    args.push(role);
  }
  if (status) {
    where.push('u.status = ?');
    args.push(status);
  }
  if (department) {
    where.push('u.department_id = ?');
    args.push(Number(department));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM users u ${whereSql}`, args)?.c ?? 0;

  const users = queryAll<{
    id: number;
    name: string;
    email: string;
    role_key: string;
    role_name: string;
    job_title: string;
    department: string | null;
    status: string;
    joined_at: string | null;
    last_login_at: string | null;
    open_tasks: number;
  }>(
    `SELECT u.id, TRIM(u.first_name || ' ' || u.last_name) AS name, u.email, u.role_key, r.name AS role_name,
            u.job_title, d.name AS department, u.status, u.joined_at, u.last_login_at,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id = u.id AND t.status NOT IN ('approved','cancelled')) AS open_tasks
       FROM users u
       LEFT JOIN roles r ON r.key = u.role_key
       LEFT JOIN departments d ON d.id = u.department_id
       ${whereSql}
      ORDER BY CASE u.status WHEN 'active' THEN 0 WHEN 'invited' THEN 1 ELSE 2 END, u.first_name
      LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (page - 1) * PER_PAGE],
  );

  const departments = queryAll<{ id: number; name: string }>('SELECT id, name FROM departments ORDER BY name');
  const counts = queryAll<{ status: string; c: number }>('SELECT status, COUNT(*) AS c FROM users GROUP BY status');
  const countFor = (s: string) => counts.find((c) => c.status === s)?.c ?? 0;

  return (
    <>
      <PageHeader
        title="People"
        subtitle={`${total} account${total === 1 ? '' : 's'} · ${countFor('active')} active · ${countFor('invited')} invited · ${countFor('disabled')} disabled`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/departments" className="inline-flex items-center rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
              Departments
            </Link>
            <Link href="/dashboard/users/new" className="inline-flex items-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              Add person
            </Link>
          </div>
        }
      />

      <FilterBar>
        <FilterField label="Search">
          <input name="q" defaultValue={q} placeholder="Name, email or job title…" className="field-input" />
        </FilterField>
        <FilterField label="Role">
          <select name="role" defaultValue={role} className="field-input">
            <option value="">All roles</option>
            {ROLE_DEFINITIONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Department">
          <select name="department" defaultValue={department} className="field-input">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status} className="field-input">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="disabled">Disabled</option>
          </select>
        </FilterField>
        <button type="submit" className="inline-flex h-[42px] items-center rounded-xl bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800">
          Filter
        </button>
        {(q || role || status || department) && (
          <Link href="/dashboard/users" className="inline-flex h-[42px] items-center rounded-xl border border-navy-200 px-4 text-sm text-navy-700 hover:bg-navy-50">
            Clear
          </Link>
        )}
      </FilterBar>

      <Panel padded={false}>
        <TableWrap className="rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Department</th>
                <th>Open tasks</th>
                <th>Status</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((person) => (
                <tr key={person.id}>
                  <td>
                    <span className="flex items-center gap-3">
                      <Avatar name={person.name} size={34} />
                      <span className="min-w-0">
                        <Link href={`/dashboard/users/${person.id}`} className="block truncate font-medium text-navy-900 hover:text-brand-600">
                          {person.name}
                        </Link>
                        <span className="block truncate text-xs text-navy-500">{person.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="text-xs">
                    <span className="block font-medium text-navy-800">{person.role_name}</span>
                    {person.job_title && <span className="block text-navy-500">{person.job_title}</span>}
                  </td>
                  <td className="text-xs text-navy-600">{person.department || '—'}</td>
                  <td className="text-xs text-navy-600">{person.open_tasks}</td>
                  <td>
                    <Badge tone={person.status === 'active' ? 'success' : person.status === 'invited' ? 'warning' : 'danger'}>
                      {person.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap text-xs text-navy-500">{person.last_login_at ? formatDate(person.last_login_at) : 'Never'}</td>
                </tr>
              ))}
              {users.length === 0 && <EmptyRow colSpan={6}>No people match these filters.</EmptyRow>}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <Pagination page={page} perPage={PER_PAGE} total={total} basePath="/dashboard/users" params={{ q, role, status, department }} />
    </>
  );
}
