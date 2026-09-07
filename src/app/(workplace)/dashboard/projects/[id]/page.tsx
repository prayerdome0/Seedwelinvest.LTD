import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText, Paperclip, Users } from 'lucide-react';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/Badge';
import { Paragraphs } from '@/components/ui/Prose';
import { formatDate, formatDateTime, lines } from '@/lib/utils';
import { ProjectConversation } from '@/components/dashboard/ProjectConversation';
import { ActionForm } from '@/components/dashboard/forms';
import { addProjectTaskAction, toggleProjectTaskAction, uploadProjectFileAction } from '@/app/actions/workplace';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('/dashboard/projects');
  const { id } = await params;
  const projectId = Number(id);

  const project = queryOne<{
    id: number;
    name: string;
    client_id: number | null;
    client_label: string;
    summary: string;
    description: string;
    status: string;
    progress: number;
    start_date: string | null;
    deadline: string | null;
    services: string;
    technologies: string;
    results: string;
    link: string;
    is_published: number;
    created_at: string;
    owner_name: string | null;
  }>(
    `SELECT p.*, (SELECT TRIM(first_name || ' ' || last_name) FROM users u WHERE u.id = p.owner_id) AS owner_name
       FROM projects p WHERE p.id = ?`,
    [projectId],
  );

  if (!project) notFound();

  const isMember = !!queryOne('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, user.id]);
  const canViewAny = user.permissions.includes('projects.view_any') || user.permissions.includes('system.super');
  if (!isMember && !canViewAny) notFound();

  const canManage = user.permissions.includes('projects.manage') || user.permissions.includes('system.super');

  const members = queryAll<{ id: number; name: string; job_title: string }>(
    `SELECT u.id, TRIM(u.first_name || ' ' || u.last_name) AS name, u.job_title
       FROM project_members m JOIN users u ON u.id = m.user_id WHERE m.project_id = ? ORDER BY u.first_name`,
    [projectId],
  );

  const tasks = queryAll<{ id: number; title: string; status: string; due_date: string | null; assigned_name: string | null }>(
    `SELECT pt.id, pt.title, pt.status, pt.due_date,
            (SELECT TRIM(first_name || ' ' || last_name) FROM users u WHERE u.id = pt.assigned_to) AS assigned_name
       FROM project_tasks pt WHERE pt.project_id = ? ORDER BY pt.status = 'completed', COALESCE(pt.due_date, '9999-12-31')`,
    [projectId],
  );

  const messages = queryAll<{ id: number; body: string; is_internal: number; created_at: string; author: string }>(
    `SELECT m.id, m.body, m.is_internal, m.created_at, TRIM(u.first_name || ' ' || u.last_name) AS author
       FROM project_messages m JOIN users u ON u.id = m.user_id WHERE m.project_id = ? ORDER BY m.created_at ASC`,
    [projectId],
  );

  const files = queryAll<{ id: number; name: string; path: string; size: number; is_client_visible: number; created_at: string }>(
    'SELECT id, name, path, size, is_client_visible, created_at FROM project_files WHERE project_id = ? ORDER BY created_at DESC',
    [projectId],
  );

  const linkedTasks = queryAll<{ id: number; title: string; status: string }>(
    "SELECT id, title, status FROM tasks WHERE project_id = ? AND status NOT IN ('approved','cancelled') ORDER BY due_date",
    [projectId],
  );

  const services = lines(project.services);
  const results = lines(project.results);

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={project.status} />
            <span>{project.client_label || 'Internal project'}</span>
            {project.is_published ? <span className="chip">Published on website</span> : null}
          </span>
        }
        breadcrumb={[{ label: 'Projects', href: '/dashboard/projects' }, { label: project.name }]}
        actions={
          canManage ? (
            <Link href={`/dashboard/projects?edit=${projectId}`} className="inline-flex items-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              Edit project
            </Link>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <Panel title="Overview">
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-navy-500">
                <span>Progress</span>
                <span className="font-semibold text-navy-900">{project.progress}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-100">
                <div className="h-full rounded-full bg-navy-900" style={{ width: `${project.progress}%` }} />
              </div>
            </div>

            {project.description && (
              <div className="mb-4">
                <Paragraphs text={project.description} />
              </div>
            )}

            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Owner</dt>
                <dd className="mt-0.5 text-navy-800">{project.owner_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Start</dt>
                <dd className="mt-0.5 text-navy-800">{project.start_date ? formatDate(project.start_date) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Target</dt>
                <dd className="mt-0.5 text-navy-800">{project.deadline ? formatDate(project.deadline) : '—'}</dd>
              </div>
            </dl>

            {services.length > 0 && (
              <div className="mt-5 border-t border-navy-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Services</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {services.map((service) => (
                    <span key={service} className="chip">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-5 border-t border-navy-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Outcomes</p>
                <ul className="mt-2 space-y-1.5">
                  {results.map((result) => (
                    <li key={result} className="flex items-start gap-2 text-sm text-navy-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                      {result}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Milestones" subtitle={`${tasks.filter((t) => t.status === 'completed').length} of ${tasks.length} complete`}>
            {tasks.length === 0 ? (
              <p className="text-sm text-navy-500">No milestones yet.</p>
            ) : (
              <ul className="divide-y divide-navy-100">
                {tasks.map((task) => (
                  <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className={`block text-sm ${task.status === 'completed' ? 'text-navy-400 line-through' : 'text-navy-900'}`}>
                        {task.title}
                      </span>
                      <span className="block text-2xs text-navy-500">
                        {task.assigned_name || 'Unassigned'}
                        {task.due_date ? ` · ${formatDate(task.due_date)}` : ''}
                      </span>
                    </span>
                    <ActionForm
                      action={toggleProjectTaskAction}
                      submitLabel={task.status === 'completed' ? 'Reopen' : 'Mark done'}
                      variant="outline"
                      size="sm"
                    >
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="done" value={task.status === 'completed' ? '0' : '1'} />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}

            {canManage && (
              <div className="mt-5 border-t border-navy-100 pt-4">
                <ActionForm action={addProjectTaskAction} submitLabel="Add milestone" variant="outline" formClassName="space-y-3">
                  <input type="hidden" name="project_id" value={projectId} />
                  <input name="title" placeholder="Milestone title" className="field-input" required />
                  <div className="flex flex-wrap gap-2">
                    <input name="due_date" type="date" className="field-input h-9 max-w-[180px] py-1 text-xs" />
                    <select name="assigned_to" className="field-input h-9 max-w-[220px] py-1 text-xs" defaultValue="">
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </ActionForm>
              </div>
            )}
          </Panel>

          <ProjectConversation
            projectId={projectId}
            messages={messages}
            canPostInternal={canManage || user.permissions.includes('projects.view_any')}
          />
        </div>

        <div className="space-y-5">
          <Panel title="Team" subtitle={`${members.length} member${members.length === 1 ? '' : 's'}`}>
            {members.length === 0 ? (
              <p className="text-sm text-navy-500">Nobody assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center gap-3">
                    <Avatar name={member.name} size={34} />
                    <span className="min-w-0">
                      <Link href={`/dashboard/users/${member.id}`} className="block truncate text-sm font-medium text-navy-900 hover:text-brand-600">
                        {member.name}
                      </Link>
                      <span className="block truncate text-xs text-navy-500">{member.job_title || 'Team member'}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Files" subtitle={`${files.length} file${files.length === 1 ? '' : 's'}`}>
            {files.length > 0 && (
              <ul className="mb-4 space-y-2">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip size={14} className="shrink-0 text-navy-400" aria-hidden />
                      <span className="truncate text-navy-700">{file.name}</span>
                    </span>
                    <a href={`/api/files/${file.path}`} className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700">
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {canManage && (
              <ActionForm action={uploadProjectFileAction} submitLabel="Upload" variant="outline" size="sm" formClassName="space-y-2">
                <input type="hidden" name="project_id" value={projectId} />
                <input type="file" name="file" className="block w-full text-xs text-navy-600 file:mr-2 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-1.5 file:text-xs file:text-white" />
                <label className="flex items-center gap-2 text-xs text-navy-600">
                  <input type="checkbox" name="client_visible" className="h-4 w-4 rounded border-navy-300" /> Visible to the client
                </label>
              </ActionForm>
            )}
          </Panel>

          {linkedTasks.length > 0 && (
            <Panel title="Linked tasks">
              <ul className="space-y-2">
                {linkedTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-2">
                    <Link href={`/dashboard/tasks/${task.id}`} className="truncate text-sm text-navy-800 hover:text-brand-600">
                      {task.title}
                    </Link>
                    <StatusPill status={task.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Details">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-navy-500">Created</dt>
                <dd className="text-navy-800">{formatDateTime(project.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-navy-500">Technologies</dt>
                <dd className="text-right text-navy-800">{project.technologies || '—'}</dd>
              </div>
              {project.link && (
                <div className="flex justify-between gap-3">
                  <dt className="text-navy-500">Live link</dt>
                  <dd>
                    <a href={project.link} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:text-brand-700">
                      Visit
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex items-center gap-2 text-2xs text-navy-500">
              <Users size={13} aria-hidden /> Everyone in the project team sees this page.
            </div>
            <div className="mt-2 flex items-center gap-2 text-2xs text-navy-500">
              <FileText size={13} aria-hidden /> Files are stored privately and access-checked on every download.
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
