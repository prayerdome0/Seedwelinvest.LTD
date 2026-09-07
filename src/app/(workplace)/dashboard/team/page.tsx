import Link from 'next/link';
import { PageHeader, Panel, StatCard } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/Badge';
import { formatDate, todayRange } from '@/lib/utils';
import { TASK_STATUS_LABELS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const user = await requirePermission('team.monitor', '/dashboard/team');
  const { start, end } = todayRange();
  const today = new Date().toISOString().slice(0, 10);

  const members = queryAll<{
    id: number;
    name: string;
    job_title: string;
    role_name: string;
    department: string | null;
    open: number;
    in_progress: number;
    submitted: number;
    completed: number;
    late: number;
    due_today: number;
  }>(
    `SELECT u.id, TRIM(u.first_name || ' ' || u.last_name) AS name, u.job_title, r.name AS role_name,
            d.name AS department,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id = u.id AND t.status NOT IN ('approved','cancelled')) AS open,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id = u.id AND t.status IN ('on_it','in_progress','changes_required')) AS in_progress,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id = u.id AND t.status IN ('submitted','resubmitted')) AS submitted,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id = u.id AND t.status = 'approved') AS completed,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id = u.id AND t.due_date IS NOT NULL AND t.due_date < ? AND t.status NOT IN ('approved','cancelled')) AS late,
            (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
              WHERE ta.user_id = u.id AND t.due_date >= ? AND t.due_date < ? AND t.status NOT IN ('approved','cancelled')) AS due_today
       FROM users u
       LEFT JOIN roles r ON r.key = u.role_key
       LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.status = 'active' AND u.role_key NOT IN ('client','applicant')
      ORDER BY late DESC, open DESC, u.first_name`,
    [today, start.slice(0, 10), end.slice(0, 10)],
  );

  const submittedWork = queryAll<{ id: number; title: string; status: string; assignees: string | null; due_date: string | null }>(
    `SELECT t.id, t.title, t.status, t.due_date,
            (SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ') FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = t.id) AS assignees
       FROM tasks t WHERE t.status IN ('submitted','resubmitted') ORDER BY t.updated_at DESC`,
  );

  const lateWork = queryAll<{ id: number; title: string; status: string; assignees: string | null; due_date: string | null }>(
    `SELECT t.id, t.title, t.status, t.due_date,
            (SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ') FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = t.id) AS assignees
       FROM tasks t
      WHERE t.due_date IS NOT NULL AND t.due_date < ? AND t.status NOT IN ('approved','cancelled')
      ORDER BY t.due_date ASC`,
    [today],
  );

  const totals = members.reduce(
    (acc, m) => ({
      open: acc.open + m.open,
      submitted: acc.submitted + m.submitted,
      late: acc.late + m.late,
      completed: acc.completed + m.completed,
    }),
    { open: 0, submitted: 0, late: 0, completed: 0 },
  );

  const unassigned = queryOne<{ c: number }>(
    'SELECT COUNT(*) AS c FROM tasks t WHERE NOT EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id) AND t.status NOT IN (?,?)',
    ['approved', 'cancelled'],
  )?.c ?? 0;

  return (
    <>
      <PageHeader
        title="Team today"
        subtitle="Who is working on what, what is late and what is waiting for your review."
        actions={
          <Link href="/dashboard/tasks/new" className="inline-flex items-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            Assign work
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Team members" value={members.length} tone="navy" />
        <StatCard label="Open tasks" value={totals.open} />
        <StatCard label="Due today" value={members.reduce((sum, m) => sum + m.due_today, 0)} />
        <StatCard label="Late" value={totals.late} tone={totals.late ? 'warning' : 'soft'} />
        <StatCard label="Awaiting approval" value={totals.submitted} tone={totals.submitted ? 'gold' : 'soft'} href="/dashboard/tasks?status=submitted" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Staff workload" subtitle="Open · in progress · submitted · late" padded={false}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Open</th>
                    <th>In progress</th>
                    <th>Submitted</th>
                    <th>Late</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <span className="flex items-center gap-3">
                          <Avatar name={member.name} size={34} />
                          <span className="min-w-0">
                            <Link href={`/dashboard/users/${member.id}`} className="block truncate font-medium text-navy-900 hover:text-brand-600">
                              {member.name}
                            </Link>
                            <span className="block truncate text-xs text-navy-500">
                              {member.job_title || member.role_name}
                              {member.department ? ` · ${member.department}` : ''}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td>{member.open}</td>
                      <td>{member.in_progress}</td>
                      <td>
                        {member.submitted > 0 ? (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">{member.submitted}</span>
                        ) : (
                          0
                        )}
                      </td>
                      <td>
                        {member.late > 0 ? (
                          <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">{member.late}</span>
                        ) : (
                          0
                        )}
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-navy-500">
                        No active staff members.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Submitted work" subtitle={`${submittedWork.length} waiting for review`}>
            {submittedWork.length === 0 ? (
              <p className="py-3 text-sm text-navy-500">Nothing waiting for review.</p>
            ) : (
              <ul className="space-y-3">
                {submittedWork.map((task) => (
                  <li key={task.id}>
                    <Link href={`/dashboard/tasks/${task.id}`} className="block text-sm font-medium text-navy-900 hover:text-brand-600">
                      {task.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusPill status={task.status} label={TASK_STATUS_LABELS[task.status]} />
                      <span className="text-2xs text-navy-500">{task.assignees || 'Unassigned'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Late work" subtitle={`${lateWork.length} past deadline`}>
            {lateWork.length === 0 ? (
              <p className="py-3 text-sm text-navy-500">Everything is on time.</p>
            ) : (
              <ul className="space-y-3">
                {lateWork.map((task) => (
                  <li key={task.id}>
                    <Link href={`/dashboard/tasks/${task.id}`} className="block text-sm font-medium text-navy-900 hover:text-brand-600">
                      {task.title}
                    </Link>
                    <p className="mt-0.5 text-2xs text-brand-600">Due {formatDate(task.due_date)}</p>
                    <p className="text-2xs text-navy-500">{task.assignees || 'Unassigned'}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {unassigned > 0 && user.permissions.includes('tasks.assign') && (
            <Panel title="Unassigned tasks">
              <p className="text-sm text-navy-600">
                <strong className="font-semibold text-navy-900">{unassigned}</strong> task{unassigned === 1 ? '' : 's'}{' '}
                {unassigned === 1 ? 'has' : 'have'} nobody assigned.
              </p>
              <Link href="/dashboard/tasks" className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
                Review tasks →
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
