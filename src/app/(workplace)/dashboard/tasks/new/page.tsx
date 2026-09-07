import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { TaskForm } from '@/components/dashboard/TaskForm';

export const dynamic = 'force-dynamic';

export default async function NewTaskPage() {
  const user = await requirePermission('tasks.create', '/dashboard/tasks/new');

  const people = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' ORDER BY first_name, last_name",
  );
  const projects = queryAll<{ id: number; name: string }>(
    "SELECT id, name FROM projects WHERE status NOT IN ('completed','cancelled') ORDER BY name",
  );
  const departments = queryAll<{ id: number; name: string }>('SELECT id, name FROM departments ORDER BY name');

  return (
    <>
      <PageHeader
        title="New task"
        subtitle="Create work, set the deadline and assign it to one or more people."
        breadcrumb={[{ label: 'Tasks', href: '/dashboard/tasks' }, { label: 'New' }]}
        actions={
          <Link href="/dashboard/tasks" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
            Back to tasks
          </Link>
        }
      />
      <div className="max-w-3xl">
        <TaskForm
          people={people}
          projects={projects}
          departments={departments}
          canAssign={user.permissions.includes('tasks.assign') || user.permissions.includes('system.super')}
        />
      </div>
    </>
  );
}
