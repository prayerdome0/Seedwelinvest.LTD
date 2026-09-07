import Link from 'next/link';
import { FolderOpen, Plus } from 'lucide-react';
import { PageHeader, Panel, EmptyRow, TableWrap, StatCard } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { StatusPill } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { ProjectForm } from '@/components/dashboard/ProjectForm';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ new?: string; edit?: string; status?: string }> }) {
  const user = await requirePermission('projects.view_any', '/dashboard/projects');
  const params = await searchParams;
  const status = params.status || '';
  const editingId = Number(params.edit || 0);

  const args: unknown[] = [];
  let whereSql = '';
  if (status) {
    whereSql = 'WHERE p.status = ?';
    args.push(status);
  }

  const projects = queryAll<{
    id: number;
    slug: string;
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
    is_featured: number;
    tasks: number;
    open_tasks: number;
  }>(
    `SELECT p.*,
            (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.id) AS tasks,
            (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.id AND pt.status != 'completed') AS open_tasks
       FROM projects p ${whereSql}
      ORDER BY CASE p.status WHEN 'active' THEN 0 WHEN 'planning' THEN 1 WHEN 'review' THEN 2 WHEN 'on_hold' THEN 3 ELSE 4 END,
               COALESCE(p.deadline, '9999-12-31') ASC`,
    args,
  );

  const counts = queryAll<{ status: string; c: number }>('SELECT status, COUNT(*) AS c FROM projects GROUP BY status');
  const countFor = (s: string) => counts.find((c) => c.status === s)?.c ?? 0;

  const clients = queryAll<{ id: number; company_name: string }>('SELECT id, company_name FROM clients ORDER BY company_name');
  const people = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' AND role_key NOT IN ('client','applicant') ORDER BY first_name",
  );

  const editing = editingId ? projects.find((p) => p.id === editingId) : undefined;
  const canManage = user.permissions.includes('projects.manage') || user.permissions.includes('system.super');
  const members = editing ? queryAll<{ user_id: number }>('SELECT user_id FROM project_members WHERE project_id = ?', [editing.id]).map((r) => r.user_id) : [];

  if (params.new === '1' || editing) {
    return (
      <>
        <PageHeader
          title={editing ? 'Edit project' : 'New project'}
          subtitle={editing ? editing.name : 'Track delivery from kick-off to handover.'}
          breadcrumb={[{ label: 'Projects', href: '/dashboard/projects' }, { label: editing ? 'Edit' : 'New' }]}
          actions={
            <Link href="/dashboard/projects" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
              Back to projects
            </Link>
          }
        />
        <div className="max-w-3xl">
          <ProjectForm
            clients={clients}
            people={people}
            defaults={
              editing
                ? {
                    id: editing.id,
                    name: editing.name,
                    client_id: editing.client_id,
                    client_label: editing.client_label,
                    summary: editing.summary,
                    description: editing.description,
                    status: editing.status,
                    progress: editing.progress,
                    start_date: editing.start_date,
                    deadline: editing.deadline,
                    services: editing.services,
                    technologies: editing.technologies,
                    results: editing.results,
                    link: editing.link,
                    is_published: editing.is_published,
                    is_featured: editing.is_featured,
                    members,
                  }
                : undefined
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Client and internal delivery work."
        actions={
          canManage ? (
            <Link href="/dashboard/projects?new=1" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              <Plus size={16} aria-hidden /> New project
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active" value={countFor('active')} tone="navy" />
        <StatCard label="Planning" value={countFor('planning')} />
        <StatCard label="In review" value={countFor('review')} tone="gold" />
        <StatCard label="Completed" value={countFor('completed')} tone="success" />
      </div>

      <Panel padded={false} className="mt-5">
        <TableWrap className="rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Progress</th>
                <th>Target date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link href={`/dashboard/projects/${project.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                      {project.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-navy-500">
                      {project.open_tasks} of {project.tasks} milestones open
                      {project.is_published ? ' · on website' : ''}
                    </p>
                  </td>
                  <td className="text-xs text-navy-600">{project.client_label || '—'}</td>
                  <td>
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-navy-100">
                        <span className="block h-full rounded-full bg-navy-900" style={{ width: `${project.progress}%` }} />
                      </span>
                      <span className="text-xs text-navy-500">{project.progress}%</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-navy-600">{project.deadline ? formatDate(project.deadline) : '—'}</td>
                  <td>
                    <StatusPill status={project.status} />
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <EmptyRow colSpan={5}>
                  <span className="inline-flex items-center gap-2">
                    <FolderOpen size={16} aria-hidden /> No projects yet.
                  </span>
                </EmptyRow>
              )}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </>
  );
}
