import Link from 'next/link';
import { PageHeader, Panel, StatCard, TableWrap, EmptyRow } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { percent } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  await requirePermission('reports.view', '/dashboard/reports');

  const people = queryOne<{ total: number; active: number; staff: number; clients: number; applicants: number; invited: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 'active' AND role_key NOT IN ('client','applicant') THEN 1 ELSE 0 END) AS staff,
            SUM(CASE WHEN role_key = 'client' THEN 1 ELSE 0 END) AS clients,
            SUM(CASE WHEN role_key = 'applicant' THEN 1 ELSE 0 END) AS applicants,
            SUM(CASE WHEN status = 'invited' THEN 1 ELSE 0 END) AS invited
       FROM users`,
  );

  const tasks = queryOne<{ total: number; approved: number; submitted: number; late: number; in_progress: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN status IN ('submitted','resubmitted') THEN 1 ELSE 0 END) AS submitted,
            SUM(CASE WHEN due_date IS NOT NULL AND due_date < date('now') AND status NOT IN ('approved','cancelled') THEN 1 ELSE 0 END) AS late,
            SUM(CASE WHEN status IN ('on_it','in_progress') THEN 1 ELSE 0 END) AS in_progress
       FROM tasks`,
  );

  const requests = queryOne<{ total: number; open: number; completed: number; rejected: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status NOT IN ('completed','rejected','cancelled') THEN 1 ELSE 0 END) AS open,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
       FROM service_requests`,
  );

  const projects = queryOne<{ total: number; active: number; completed: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status IN ('planning','active','review') THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM projects`,
  );

  const recruitment = queryOne<{ total: number; active: number; accepted: number; rejected: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status NOT IN ('accepted','rejected','archived') THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
       FROM applications`,
  );

  const byDepartment = queryAll<{ department: string; people: number; open_tasks: number; late: number }>(
    `SELECT COALESCE(d.name, 'Unassigned') AS department,
            COUNT(DISTINCT u.id) AS people,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id IN (SELECT id FROM users WHERE department_id = d.id)
                AND t.status NOT IN ('approved','cancelled')) AS open_tasks,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id IN (SELECT id FROM users WHERE department_id = d.id)
                AND t.due_date IS NOT NULL AND t.due_date < date('now') AND t.status NOT IN ('approved','cancelled')) AS late
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.status = 'active' AND u.role_key NOT IN ('client','applicant')
      GROUP BY d.id, d.name
      ORDER BY people DESC`,
  );

  const topPerformers = queryAll<{ id: number; name: string; completed: number; late: number }>(
    `SELECT u.id, TRIM(u.first_name || ' ' || u.last_name) AS name,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id = u.id AND t.status = 'approved') AS completed,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id = u.id AND t.due_date IS NOT NULL AND t.due_date < date('now')
                AND t.status NOT IN ('approved','cancelled')) AS late
       FROM users u WHERE u.status = 'active'
      ORDER BY completed DESC, late ASC LIMIT 8`,
  );

  const auditSummary = queryAll<{ action: string; c: number }>(
    "SELECT action, COUNT(*) AS c FROM audit_logs WHERE created_at > datetime('now', '-30 days') GROUP BY action ORDER BY c DESC LIMIT 10",
  );

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="A live view of people, work, clients, recruitment and delivery."
        actions={
          <Link href="/dashboard/audit" className="inline-flex items-center rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
            Audit log
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="People" value={people?.total ?? 0} hint={`${people?.staff ?? 0} staff · ${people?.clients ?? 0} clients · ${people?.applicants ?? 0} applicants`} tone="navy" />
        <StatCard label="On-time completion" value={`${percent(tasks?.approved ?? 0, tasks?.total ?? 0)}%`} hint={`${tasks?.approved ?? 0} of ${tasks?.total ?? 0} tasks approved`} tone="success" />
        <StatCard label="Late tasks" value={tasks?.late ?? 0} tone={(tasks?.late ?? 0) > 0 ? 'warning' : 'soft'} />
        <StatCard label="Requests completed" value={requests?.completed ?? 0} hint={`${requests?.open ?? 0} still open`} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title="Workload by department">
          <TableWrap className="rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>People</th>
                  <th>Open tasks</th>
                  <th>Late</th>
                </tr>
              </thead>
              <tbody>
                {byDepartment.map((row) => (
                  <tr key={row.department}>
                    <td className="font-medium text-navy-900">{row.department}</td>
                    <td>{row.people}</td>
                    <td>{row.open_tasks}</td>
                    <td className={row.late > 0 ? 'font-semibold text-brand-600' : ''}>{row.late}</td>
                  </tr>
                ))}
                {byDepartment.length === 0 && <EmptyRow colSpan={4}>No departments yet.</EmptyRow>}
              </tbody>
            </table>
          </TableWrap>
        </Panel>

        <Panel title="Most completed work">
          <TableWrap className="rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Completed</th>
                  <th>Late</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <Link href={`/dashboard/users/${person.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                        {person.name}
                      </Link>
                    </td>
                    <td>{person.completed}</td>
                    <td className={person.late > 0 ? 'font-semibold text-brand-600' : ''}>{person.late}</td>
                  </tr>
                ))}
                {topPerformers.length === 0 && <EmptyRow colSpan={3}>No completed work yet.</EmptyRow>}
              </tbody>
            </table>
          </TableWrap>
        </Panel>

        <Panel title="Delivery">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-500">Projects</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {projects?.total ?? 0}
                <span className="ml-1 text-xs font-normal text-navy-500">({projects?.active ?? 0} active)</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-500">Completed projects</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">{projects?.completed ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-500">Tasks in progress</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">{tasks?.in_progress ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-500">Awaiting approval</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">{tasks?.submitted ?? 0}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Recruitment">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-500">Applications</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">{recruitment?.total ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-500">Active in pipeline</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">{recruitment?.active ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-500">Accepted</dt>
              <dd className="mt-1 text-lg font-semibold text-emerald-600">{recruitment?.accepted ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-500">Rejected</dt>
              <dd className="mt-1 text-lg font-semibold text-brand-600">{recruitment?.rejected ?? 0}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-navy-500">
            Conversion (accepted of decided):{' '}
            {percent(recruitment?.accepted ?? 0, (recruitment?.accepted ?? 0) + (recruitment?.rejected ?? 0))}%
          </p>
        </Panel>

        <Panel title="System activity (last 30 days)" className="lg:col-span-2">
          <TableWrap className="rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {auditSummary.map((row) => (
                  <tr key={row.action}>
                    <td className="font-medium text-navy-900">{row.action}</td>
                    <td>{row.c}</td>
                  </tr>
                ))}
                {auditSummary.length === 0 && <EmptyRow colSpan={2}>No recorded activity yet.</EmptyRow>}
              </tbody>
            </table>
          </TableWrap>
        </Panel>
      </div>
    </>
  );
}
