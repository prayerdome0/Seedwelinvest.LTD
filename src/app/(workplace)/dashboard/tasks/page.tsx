import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { PageHeader, Panel, Pagination, EmptyRow, FilterBar, FilterField, TableWrap } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { StatusPill } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const PER_PAGE = 20;

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser('/dashboard/tasks');
  const params = await searchParams;
  const canViewAny = user.permissions.includes('tasks.view_any') || user.permissions.includes('system.super');

  const page = Math.max(1, Number(params.page || 1));
  const status = params.status || '';
  const priority = params.priority || '';
  const assignee = params.assignee || '';
  const overdue = params.overdue === '1';
  const q = (params.q || '').trim();
  const today = new Date().toISOString().slice(0, 10);

  const where: string[] = [];
  const args: unknown[] = [today];

  if (!canViewAny) {
    where.push('EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?)');
    args.push(user.id);
  }
  if (status) {
    where.push('t.status = ?');
    args.push(status);
  }
  if (priority) {
    where.push('t.priority = ?');
    args.push(priority);
  }
  if (assignee) {
    where.push('EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?)');
    args.push(Number(assignee));
  }
  if (overdue) {
    where.push("t.due_date IS NOT NULL AND t.due_date < ? AND t.status NOT IN ('approved','cancelled')");
    args.push(today);
  }
  if (q) {
    where.push('(t.title LIKE ? OR t.description LIKE ?)');
    args.push(`%${q}%`, `%${q}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  // args[0] belongs to the is_overdue CASE in the SELECT list, not the WHERE clause.
  const countArgs = args.slice(1);
  const total = queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM tasks t ${whereSql}`, countArgs)?.c ?? 0;

  const tasks = queryAll<{
    id: number;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    created_at: string;
    is_overdue: number;
    project_name: string | null;
    assignees: string | null;
  }>(
    `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.created_at,
            CASE WHEN t.due_date IS NOT NULL AND t.due_date < ? AND t.status NOT IN ('approved','cancelled') THEN 1 ELSE 0 END AS is_overdue,
            p.name AS project_name,
            (SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ')
               FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = t.id) AS assignees
       FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
       ${whereSql}
      ORDER BY CASE t.status WHEN 'submitted' THEN 0 WHEN 'resubmitted' THEN 1 WHEN 'changes_required' THEN 2 WHEN 'overdue' THEN 3 ELSE 4 END,
               COALESCE(t.due_date, '9999-12-31') ASC, t.created_at DESC
      LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (page - 1) * PER_PAGE],
  );

  const people = canViewAny
    ? queryAll<{ id: number; name: string }>(
        "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' ORDER BY first_name",
      )
    : [];

  const counts = queryAll<{ status: string; c: number }>('SELECT status, COUNT(*) AS c FROM tasks GROUP BY status');
  const countFor = (s: string) => counts.find((c) => c.status === s)?.c ?? 0;

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle={canViewAny ? 'Every task in the company.' : 'Tasks assigned to you.'}
        actions={
          user.permissions.includes('tasks.create') ? (
            <Link href="/dashboard/tasks/new" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              <Plus size={16} aria-hidden /> New task
            </Link>
          ) : null
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/dashboard/tasks" className={`chip ${!status ? 'border-navy-900 bg-navy-900 text-white' : ''}`}>
          All {counts.reduce((sum, c) => sum + c.c, 0)}
        </Link>
        {TASK_STATUSES.filter((s) => countFor(s) > 0).map((s) => (
          <Link key={s} href={`/dashboard/tasks?status=${s}`} className={`chip ${status === s ? 'border-navy-900 bg-navy-900 text-white' : ''}`}>
            {TASK_STATUS_LABELS[s]} {countFor(s)}
          </Link>
        ))}
        <Link href="/dashboard/tasks?overdue=1" className={`chip ${overdue ? 'border-navy-900 bg-navy-900 text-white' : ''}`}>
          Overdue
        </Link>
      </div>

      <FilterBar>
        <FilterField label="Search">
          <input name="q" defaultValue={q} placeholder="Task title…" className="field-input" />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status} className="field-input">
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Priority">
          <select name="priority" defaultValue={priority} className="field-input">
            <option value="">Any priority</option>
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </FilterField>
        {people.length > 0 && (
          <FilterField label="Assigned to">
            <select name="assignee" defaultValue={assignee} className="field-input">
              <option value="">Anyone</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FilterField>
        )}
        <button type="submit" className="inline-flex h-[42px] items-center rounded-xl bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800">
          Filter
        </button>
        {(q || status || priority || assignee || overdue) && (
          <Link href="/dashboard/tasks" className="inline-flex h-[42px] items-center rounded-xl border border-navy-200 px-4 text-sm text-navy-700 hover:bg-navy-50">
            Clear
          </Link>
        )}
      </FilterBar>

      <Panel padded={false}>
        <TableWrap className="rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Assigned to</th>
                <th>Priority</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Link href={`/dashboard/tasks/${task.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                      {task.title}
                    </Link>
                    {task.project_name && <p className="mt-0.5 text-xs text-navy-500">{task.project_name}</p>}
                  </td>
                  <td className="text-xs text-navy-600">{task.assignees || <span className="text-navy-400">Unassigned</span>}</td>
                  <td className="text-xs capitalize text-navy-600">{task.priority}</td>
                  <td className={`whitespace-nowrap text-xs ${task.is_overdue ? 'font-semibold text-brand-600' : 'text-navy-600'}`}>
                    {task.due_date ? formatDate(task.due_date) : '—'}
                  </td>
                  <td>
                    <StatusPill status={task.status} label={TASK_STATUS_LABELS[task.status]} />
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <EmptyRow colSpan={5}>
                  <span className="inline-flex items-center gap-2">
                    <ClipboardList size={16} aria-hidden /> No tasks match these filters.
                  </span>
                </EmptyRow>
              )}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <Pagination page={page} perPage={PER_PAGE} total={total} basePath="/dashboard/tasks" params={{ status, priority, assignee, q, overdue: overdue ? '1' : '' }} />
    </>
  );
}
