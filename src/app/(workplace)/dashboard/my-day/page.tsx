import Link from 'next/link';
import { CheckCircle2, ClipboardList, Clock, Flame, Inbox, Sparkles } from 'lucide-react';
import { PageHeader, Panel, StatCard } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Section';
import { formatDate, todayRange } from '@/lib/utils';
import { TASK_STATUS_LABELS } from '@/lib/rbac';
import { getAnnouncements } from '@/lib/data/site';

export const dynamic = 'force-dynamic';

type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_name: string | null;
  is_overdue: number;
};

export default async function MyDayPage() {
  const user = await requireUser('/dashboard/my-day');
  const { start, end } = todayRange();
  const today = new Date().toISOString().slice(0, 10);

  const base = `SELECT t.id, t.title, t.status, t.priority, t.due_date, p.name AS project_name,
      CASE WHEN t.due_date IS NOT NULL AND t.due_date < ? AND t.status NOT IN ('approved','cancelled') THEN 1 ELSE 0 END AS is_overdue
    FROM tasks t JOIN task_assignees a ON a.task_id = t.id AND a.user_id = ?
    LEFT JOIN projects p ON p.id = t.project_id`;

  const todayTasks = queryAll<Task>(`${base} WHERE t.due_date >= ? AND t.due_date < ? AND t.status NOT IN ('approved','cancelled') ORDER BY t.priority DESC, t.due_date ASC`, [today, user.id, start.slice(0, 10), end.slice(0, 10)]);

  const overdue = queryAll<Task>(`${base} WHERE t.due_date IS NOT NULL AND t.due_date < ? AND t.status NOT IN ('approved','cancelled') ORDER BY t.due_date ASC`, [today, user.id, today]);

  const upcoming = queryAll<Task>(`${base} WHERE t.due_date > ? AND t.status NOT IN ('approved','cancelled') ORDER BY t.due_date ASC LIMIT 8`, [today, user.id, today]);

  const priority = queryAll<Task>(`${base} WHERE t.priority IN ('high','urgent') AND t.status NOT IN ('approved','cancelled') ORDER BY t.due_date ASC LIMIT 6`, [today, user.id]);

  const inProgress = queryAll<Task>(`${base} WHERE t.status IN ('on_it','in_progress','changes_required','resubmitted','submitted') ORDER BY t.updated_at DESC LIMIT 8`, [today, user.id]);

  const completed = queryAll<Task & { approved_at: string | null }>(
    `SELECT t.id, t.title, t.status, t.priority, t.due_date, NULL AS project_name, 0 AS is_overdue, t.approved_at
       FROM tasks t JOIN task_assignees a ON a.task_id = t.id AND a.user_id = ?
      WHERE t.status = 'approved' ORDER BY t.approved_at DESC LIMIT 8`,
    [user.id],
  );

  const submittedCount = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM tasks t JOIN task_assignees a ON a.task_id = t.id AND a.user_id = ? WHERE t.status IN ('submitted','resubmitted')",
    [user.id],
  )?.c ?? 0;

  const announcements = getAnnouncements(user.roleKey === 'client' ? 'clients' : 'staff', 3);

  const Section = ({ title, tasks, empty, icon }: { title: string; tasks: Task[]; empty: string; icon?: React.ReactNode }) => (
    <Panel title={title} subtitle={`${tasks.length} item${tasks.length === 1 ? '' : 's'}`}>
      {tasks.length === 0 ? (
        <p className="py-4 text-sm text-navy-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-navy-100">
          {tasks.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <Link href={`/dashboard/tasks/${task.id}`} className="block truncate text-sm font-medium text-navy-900 hover:text-brand-600">
                  {icon} {task.title}
                </Link>
                <p className="mt-0.5 text-xs text-navy-500">
                  {task.is_overdue ? (
                    <span className="font-medium text-brand-600">Overdue — due {formatDate(task.due_date)}</span>
                  ) : task.due_date ? (
                    `Due ${formatDate(task.due_date)}`
                  ) : (
                    'No deadline'
                  )}
                  {task.project_name ? ` · ${task.project_name}` : ''}
                </p>
              </div>
              <StatusPill status={task.status} label={TASK_STATUS_LABELS[task.status]} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );

  return (
    <>
      <PageHeader title="My Day" subtitle={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Due today" value={todayTasks.length} tone="navy" icon={<Clock size={18} />} />
        <StatCard label="Overdue" value={overdue.length} tone={overdue.length ? 'warning' : 'soft'} icon={<Flame size={18} />} />
        <StatCard label="Waiting on review" value={submittedCount} tone={submittedCount ? 'gold' : 'soft'} icon={<Inbox size={18} />} />
        <StatCard label="Completed" value={completed.length} tone="success" icon={<CheckCircle2 size={18} />} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title="Today’s tasks" tasks={todayTasks} empty="Nothing is due today." />
          {overdue.length > 0 && <Section title="Overdue" tasks={overdue} empty="Nothing overdue." />}
          <Section title="In progress" tasks={inProgress} empty="No work in progress." />
          <Section title="Upcoming deadlines" tasks={upcoming} empty="No upcoming deadlines." />
          <Section title="Completed work" tasks={completed as Task[]} empty="Nothing completed yet." icon={<CheckCircle2 size={14} className="mr-1 inline text-emerald-500" />} />
        </div>

        <div className="space-y-5">
          <Section title="Priority tasks" tasks={priority} empty="No high priority work." icon={<Sparkles size={14} className="mr-1 inline text-brand-500" />} />

          {announcements.length > 0 ? (
            <Panel title="Announcements">
              <ul className="space-y-4">
                {announcements.map((item) => (
                  <li key={item.id}>
                    <p className="text-sm font-semibold text-navy-900">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-navy-600">{item.body}</p>
                    <p className="mt-1 text-2xs text-navy-400">{formatDate(item.published_at)}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : (
            <Panel title="Announcements">
              <EmptyState title="No announcements" description="Company announcements appear here." />
            </Panel>
          )}

          <Panel title="Need help?">
            <p className="text-sm leading-relaxed text-navy-600">
              If a task is blocked, mark it as <strong className="font-semibold">Blocked</strong> and comment with what
              you need. Your manager or task manager will see it immediately.
            </p>
            <div className="mt-4">
              <Link href="/dashboard/tasks" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Browse all my tasks →
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-navy-500">
        <ClipboardList size={14} aria-hidden /> Only tasks assigned to you are shown here.
      </p>
    </>
  );
}
