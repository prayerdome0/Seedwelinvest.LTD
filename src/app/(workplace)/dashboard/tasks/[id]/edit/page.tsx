import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { TaskForm } from '@/components/dashboard/TaskForm';

export const dynamic = 'force-dynamic';

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('/dashboard/tasks');
  const { id } = await params;
  const taskId = Number(id);

  const task = queryOne<{
    id: number;
    title: string;
    description: string;
    instructions: string;
    priority: string;
    due_date: string | null;
    start_date: string | null;
    project_id: number | null;
    department_id: number | null;
    created_by: number | null;
  }>('SELECT * FROM tasks WHERE id = ?', [taskId]);

  if (!task) notFound();

  const canReview = user.permissions.includes('tasks.approve') || user.permissions.includes('system.super');
  const isAssignee = !!queryOne('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?', [taskId, user.id]);
  if (!canReview && !isAssignee && Number(task.created_by) !== user.id) notFound();

  const people = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' ORDER BY first_name, last_name",
  );
  const projects = queryAll<{ id: number; name: string }>('SELECT id, name FROM projects ORDER BY name');
  const departments = queryAll<{ id: number; name: string }>('SELECT id, name FROM departments ORDER BY name');
  const assignees = queryAll<{ user_id: number }>('SELECT user_id FROM task_assignees WHERE task_id = ?', [taskId]).map((r) => r.user_id);
  const checklist = queryAll<{ label: string }>('SELECT label FROM task_checklist WHERE task_id = ? ORDER BY sort_order', [taskId]).map((r) => r.label);

  return (
    <>
      <PageHeader
        title="Edit task"
        subtitle={task.title}
        breadcrumb={[{ label: 'Tasks', href: '/dashboard/tasks' }, { label: 'Edit' }]}
        actions={
          <Link href={`/dashboard/tasks/${taskId}`} className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
            Back to task
          </Link>
        }
      />
      <div className="max-w-3xl">
        <TaskForm
          people={people}
          projects={projects}
          departments={departments}
          canAssign={user.permissions.includes('tasks.assign') || user.permissions.includes('system.super')}
          defaults={{
            id: task.id,
            title: task.title,
            description: task.description,
            instructions: task.instructions,
            priority: task.priority,
            due_date: task.due_date,
            start_date: task.start_date,
            project_id: task.project_id,
            department_id: task.department_id,
            assignees,
            checklist,
          }}
        />
      </div>
    </>
  );
}
