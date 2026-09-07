import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Paperclip } from 'lucide-react';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/Badge';
import { Paragraphs } from '@/components/ui/Prose';
import { formatDate, formatDateTime, lines } from '@/lib/utils';
import { TASK_STATUS_LABELS } from '@/lib/rbac';
import { TaskWorkflow } from '@/components/dashboard/TaskWorkflow';
import { TaskComments } from '@/components/dashboard/TaskComments';
import { InlineActionForm } from '@/components/dashboard/forms';
import { setTaskStatusAction, deleteTaskAction } from '@/app/actions/workplace';

export const dynamic = 'force-dynamic';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('/dashboard/tasks');
  const { id } = await params;
  const taskId = Number(id);

  const task = queryOne<{
    id: number;
    reference: string;
    title: string;
    description: string;
    instructions: string;
    status: string;
    priority: string;
    due_date: string | null;
    start_date: string | null;
    completed_at: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
    created_by: number | null;
    project_id: number | null;
    project_name: string | null;
    department_name: string | null;
    creator_name: string | null;
  }>(
    `SELECT t.*, p.name AS project_name, d.name AS department_name,
            (SELECT TRIM(first_name || ' ' || last_name) FROM users WHERE id = t.created_by) AS creator_name
       FROM tasks t LEFT JOIN projects p ON p.id = t.project_id LEFT JOIN departments d ON d.id = t.department_id
      WHERE t.id = ?`,
    [taskId],
  );

  if (!task) notFound();

  const isAssignee = !!queryOne('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?', [taskId, user.id]);
  const canReview = user.permissions.includes('tasks.approve') || user.permissions.includes('system.super');
  const canViewAny = user.permissions.includes('tasks.view_any') || user.permissions.includes('system.super');
  const isCreator = Number(task.created_by) === user.id;

  if (!isAssignee && !canViewAny && !isCreator) notFound();

  const assignees = queryAll<{ id: number; name: string; job_title: string }>(
    `SELECT u.id, TRIM(u.first_name || ' ' || u.last_name) AS name, u.job_title
       FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = ? ORDER BY u.first_name`,
    [taskId],
  );

  const checklist = queryAll<{ id: number; label: string; is_done: number }>(
    'SELECT id, label, is_done FROM task_checklist WHERE task_id = ? ORDER BY sort_order',
    [taskId],
  );
  const comments = queryAll<{ id: number; body: string; kind: string; created_at: string; author: string }>(
    `SELECT c.id, c.body, c.kind, c.created_at, TRIM(u.first_name || ' ' || u.last_name) AS author
       FROM task_comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.task_id = ? ORDER BY c.created_at ASC`,
    [taskId],
  );
  const submissions = queryAll<{
    id: number;
    notes: string;
    file_path: string | null;
    status: string;
    review_notes: string;
    created_at: string;
    author: string;
  }>(
    `SELECT s.id, s.notes, s.file_path, s.status, s.review_notes, s.created_at,
            TRIM(u.first_name || ' ' || u.last_name) AS author
       FROM task_submissions s JOIN users u ON u.id = s.user_id WHERE s.task_id = ? ORDER BY s.created_at DESC`,
    [taskId],
  );
  const attachments = queryAll<{ id: number; name: string; path: string; size: number; uploaded_at: string }>(
    `SELECT a.id, a.name, a.path, a.size, a.created_at AS uploaded_at FROM task_attachments a WHERE a.task_id = ? ORDER BY a.created_at DESC`,
    [taskId],
  );

  const overdue =
    task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && !['approved', 'cancelled'].includes(task.status);

  return (
    <>
      <PageHeader
        title={task.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-navy-500">{task.reference}</span>
            <StatusPill status={task.status} label={TASK_STATUS_LABELS[task.status]} />
            {overdue && <span className="text-xs font-semibold text-brand-600">Overdue — due {formatDate(task.due_date)}</span>}
          </span>
        }
        breadcrumb={[{ label: 'Tasks', href: '/dashboard/tasks' }, { label: task.reference }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {(isCreator || canReview) && (
              <Link
                href={`/dashboard/tasks/${taskId}/edit`}
                className="inline-flex items-center rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50"
              >
                Edit
              </Link>
            )}
            {user.permissions.includes('tasks.delete') && (
              <InlineActionForm
                action={deleteTaskAction}
                fields={{ id: taskId }}
                label="Delete"
                confirm="Delete this task permanently?"
                variant="outline"
              />
            )}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-5">
          <Panel
            title="Task details"
            action={
              <span className="text-xs text-navy-500">
                Created {formatDate(task.created_at)} by {task.creator_name || 'system'}
              </span>
            }
          >
            {task.description ? (
              <div className="mb-4">
                <Paragraphs text={task.description} />
              </div>
            ) : (
              <p className="text-sm text-navy-500">No description provided.</p>
            )}

            {task.instructions && (
              <div className="rounded-xl border border-navy-100 bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Instructions</p>
                <div className="mt-2">
                  <Paragraphs text={task.instructions} className="text-sm" />
                </div>
              </div>
            )}

            {checklist.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Checklist</p>
                <ul className="mt-2 space-y-2">
                  {checklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5 text-sm">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                          item.is_done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-navy-200'
                        }`}
                        aria-hidden
                      >
                        {item.is_done ? '✓' : ''}
                      </span>
                      <span className={item.is_done ? 'text-navy-500 line-through' : 'text-navy-800'}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <TaskWorkflow
            taskId={taskId}
            status={task.status}
            isAssignee={isAssignee}
            canReview={canReview}
            submissions={submissions.map((s) => ({ id: s.id, notes: s.notes, status: s.status, review_notes: s.review_notes, created_at: s.created_at, author: s.author }))}
          />

          <TaskComments
            taskId={taskId}
            comments={comments}
            canRequestChanges={canReview}
          />
        </div>

        <div className="space-y-5">
          <Panel title="At a glance">
            <dl className="space-y-3 text-sm">
              {[
                { label: 'Priority', value: <span className="capitalize">{task.priority}</span> },
                { label: 'Start date', value: task.start_date ? formatDate(task.start_date) : '—' },
                { label: 'Due date', value: <span className={overdue ? 'font-semibold text-brand-600' : ''}>{task.due_date ? formatDate(task.due_date) : '—'}</span> },
                { label: 'Department', value: task.department_name || '—' },
                { label: 'Project', value: task.project_name ? <Link href={`/dashboard/projects/${task.project_id}`} className="text-brand-600 hover:text-brand-700">{task.project_name}</Link> : '—' },
                { label: 'Completed', value: task.completed_at ? formatDateTime(task.completed_at) : '—' },
                { label: 'Approved', value: task.approved_at ? formatDateTime(task.approved_at) : '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <dt className="text-navy-500">{row.label}</dt>
                  <dd className="text-right font-medium text-navy-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title={`Assigned to (${assignees.length})`}>
            {assignees.length === 0 ? (
              <p className="text-sm text-navy-500">Not assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {assignees.map((person) => (
                  <li key={person.id} className="flex items-center gap-3">
                    <Avatar name={person.name} size={34} />
                    <span className="min-w-0">
                      <Link href={`/dashboard/users/${person.id}`} className="block truncate text-sm font-medium text-navy-900 hover:text-brand-600">
                        {person.name}
                      </Link>
                      <span className="block truncate text-xs text-navy-500">{person.job_title || 'Team member'}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {attachments.length > 0 && (
            <Panel title="Attachments">
              <ul className="space-y-2">
                {attachments.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip size={14} className="shrink-0 text-navy-400" aria-hidden />
                      <span className="truncate text-navy-700">{file.name}</span>
                    </span>
                    <a href={`/api/files/${file.path}`} className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700">
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {['approved', 'cancelled'].includes(task.status) && (
            <Panel>
              <InlineActionForm
                action={setTaskStatusAction}
                fields={{ id: taskId, status: 'in_progress' }}
                label="Reopen task"
                variant="outline"
              />
            </Panel>
          )}

          <div className="rounded-2xl border border-navy-100 bg-mist p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-navy-600">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-navy-400" aria-hidden />
              Every status change, comment and submission is recorded in the audit log.
            </p>
          </div>

          <Link href="/dashboard/tasks" className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-900">
            <ArrowLeft size={14} aria-hidden /> Back to tasks
          </Link>
        </div>
      </div>
    </>
  );
}
