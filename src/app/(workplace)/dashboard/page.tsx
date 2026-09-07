import Link from 'next/link';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderOpen,
  Handshake,
  TrendingUp,
  UserCheck,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader, Panel, StatCard, QuickLink } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/Badge';
import { formatDate, timeAgo, todayRange } from '@/lib/utils';
import { getAnnouncements } from '@/lib/data/site';
import { TASK_STATUS_LABELS, APPLICATION_STATUS_LABELS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const user = await requireUser('/dashboard');
  const can = (permission: string) => user.permissions.includes(permission) || user.permissions.includes('system.super');
  const { start, end } = todayRange();

  const totalUsers = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM users WHERE status != 'disabled'")?.c ?? 0;
  const activeStaff = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM users WHERE status = 'active' AND role_key NOT IN ('client','applicant')",
  )?.c ?? 0;
  const clients = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM users WHERE role_key = 'client'")?.c ?? 0;
  const applicants = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM applications WHERE status NOT IN ('accepted','rejected','archived')",
  )?.c ?? 0;
  const openJobs = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM jobs WHERE status = 'published'")?.c ?? 0;
  const activeTasks = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM tasks WHERE status NOT IN ('approved','cancelled')",
  )?.c ?? 0;
  const overdueTasks = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM tasks WHERE due_date IS NOT NULL AND due_date < date('now') AND status NOT IN ('approved','cancelled','completed')",
  )?.c ?? 0;
  const pendingApprovals = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM tasks WHERE status IN ('submitted','resubmitted')",
  )?.c ?? 0;
  const openRequests = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM service_requests WHERE status NOT IN ('completed','rejected','cancelled')",
  )?.c ?? 0;
  const activeProjects = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM projects WHERE status IN ('planning','active','review')",
  )?.c ?? 0;
  const opportunities = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM opportunities WHERE status = 'published'")?.c ?? 0;

  const myTasks = queryAll<{ id: number; title: string; status: string; due_date: string | null; priority: string }>(
    `SELECT t.id, t.title, t.status, t.due_date, t.priority FROM tasks t
      JOIN task_assignees a ON a.task_id = t.id AND a.user_id = ?
     WHERE t.status NOT IN ('approved','cancelled')
     ORDER BY COALESCE(t.due_date, '9999-12-31') ASC LIMIT 6`,
    [user.id],
  );

  const dueToday = queryAll<{ id: number; title: string; status: string }>(
    `SELECT t.id, t.title, t.status FROM tasks t JOIN task_assignees a ON a.task_id = t.id AND a.user_id = ?
     WHERE t.due_date >= ? AND t.due_date < ? AND t.status NOT IN ('approved','cancelled') LIMIT 5`,
    [user.id, start.slice(0, 10), end.slice(0, 10)],
  );

  const recentTasks = can('tasks.view_any')
    ? queryAll<{ id: number; title: string; status: string; created_at: string; created_by: number }>(
        "SELECT id, title, status, created_at, created_by FROM tasks ORDER BY created_at DESC LIMIT 6",
      )
    : [];

  const recentApplications = can('applications.view')
    ? queryAll<{ id: number; first_name: string; last_name: string; status: string; created_at: string; job_title: string | null }>(
        `SELECT a.id, a.first_name, a.last_name, a.status, a.created_at, j.title AS job_title
           FROM applications a LEFT JOIN jobs j ON j.id = a.job_id
          ORDER BY a.created_at DESC LIMIT 6`,
      )
    : [];

  const recentRequests = can('service_requests.view')
    ? queryAll<{ id: number; reference: string; name: string; status: string; created_at: string; service: string | null }>(
        `SELECT r.id, r.reference, r.name, r.status, r.created_at, s.name AS service
           FROM service_requests r LEFT JOIN services s ON s.id = r.service_id
          ORDER BY r.created_at DESC LIMIT 6`,
      )
    : [];

  const teamToday = can('team.monitor')
    ? queryAll<{ id: number; full_name: string; role_name: string; job_title: string; open: number; submitted: number; overdue: number }>(
        `SELECT u.id, TRIM(u.first_name || ' ' || u.last_name) AS full_name, r.name AS role_name, u.job_title,
                (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t2 ON t2.id = ta.task_id
                  WHERE ta.user_id = u.id AND t2.status NOT IN ('approved','cancelled')) AS open,
                (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t2 ON t2.id = ta.task_id
                  WHERE ta.user_id = u.id AND t2.status IN ('submitted','resubmitted')) AS submitted,
                (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t2 ON t2.id = ta.task_id
                  WHERE ta.user_id = u.id AND t2.due_date IS NOT NULL AND t2.due_date < date('now')
                    AND t2.status NOT IN ('approved','cancelled')) AS overdue
           FROM users u LEFT JOIN roles r ON r.key = u.role_key
          WHERE u.status = 'active' AND u.role_key NOT IN ('client','applicant')
          ORDER BY overdue DESC, open DESC LIMIT 6`,
      )
    : [];

  const announcements = getAnnouncements(
    user.roleKey === 'client' ? 'clients' : user.roleKey === 'applicant' ? 'applicants' : 'staff',
    3,
  );

  const firstName = user.firstName || user.fullName;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={
          user.roleKey === 'client'
            ? 'Follow your service requests, projects and documents.'
            : user.roleKey === 'applicant'
              ? 'Track the progress of your applications.'
              : 'Here is what is happening across the company today.'
        }
        actions={
          <>
            <Link
              href="/dashboard/tasks/new"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
            >
              New task
            </Link>
            <Link
              href="/dashboard/my-day"
              className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50"
            >
              My day
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="People" value={totalUsers} hint={`${activeStaff} active staff · ${clients} clients`} tone="navy" icon={<Users size={18} />} href={can('users.view') ? '/dashboard/users' : undefined} />
        <StatCard label="Open tasks" value={activeTasks} hint={`${overdueTasks} overdue`} tone={overdueTasks > 0 ? 'warning' : 'soft'} icon={<ClipboardList size={18} />} href="/dashboard/tasks" />
        <StatCard
          label="Pending approvals"
          value={pendingApprovals}
          hint="Submitted work waiting for review"
          tone={pendingApprovals > 0 ? 'gold' : 'soft'}
          icon={<CheckCircle2 size={18} />}
          href="/dashboard/tasks?status=submitted"
        />
        <StatCard
          label="Active applicants"
          value={applicants}
          hint={`${openJobs} published vacancies`}
          tone="soft"
          icon={<UserCheck size={18} />}
          href={can('applications.view') ? '/dashboard/recruitment' : undefined}
        />
      </div>

      {overdueTasks > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
          <p className="text-sm text-brand-900">
            <strong className="font-semibold">{overdueTasks} task{overdueTasks === 1 ? '' : 's'}</strong> past the
            deadline.{' '}
            <Link href="/dashboard/tasks?overdue=1" className="font-semibold underline">
              Review overdue work
            </Link>
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel
            title="My tasks"
            subtitle="Work assigned to you that is not finished"
            action={<QuickLink href="/dashboard/my-day" label="My day" />}
          >
            {myTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-navy-500">Nothing outstanding — you are all caught up.</p>
            ) : (
              <ul className="divide-y divide-navy-100">
                {myTasks.map((task) => {
                  const overdue = task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && !['approved', 'cancelled'].includes(task.status);
                  return (
                    <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <Link href={`/dashboard/tasks/${task.id}`} className="block truncate text-sm font-medium text-navy-900 hover:text-brand-600">
                          {task.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-navy-500">
                          {task.due_date ? (overdue ? `Overdue — ${formatDate(task.due_date)}` : `Due ${formatDate(task.due_date)}`) : 'No deadline'} · {task.priority}
                        </p>
                      </div>
                      <StatusPill status={task.status} label={TASK_STATUS_LABELS[task.status]} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {can('tasks.view_any') && (
            <Panel title="Latest tasks" subtitle="Across the whole company" action={<QuickLink href="/dashboard/tasks" label="All tasks" />} padded={false}>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <Link href={`/dashboard/tasks/${task.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                            {task.title}
                          </Link>
                        </td>
                        <td>
                          <StatusPill status={task.status} label={TASK_STATUS_LABELS[task.status]} />
                        </td>
                        <td className="whitespace-nowrap text-xs text-navy-500">{timeAgo(task.created_at)}</td>
                      </tr>
                    ))}
                    {recentTasks.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-navy-500">
                          No tasks yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {can('applications.view') && (
            <Panel title="Recent applications" action={<QuickLink href="/dashboard/recruitment" label="Recruitment" />} padded={false}>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Role</th>
                      <th>Stage</th>
                      <th>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApplications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <Link href={`/dashboard/recruitment/applications/${application.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                            {application.first_name} {application.last_name}
                          </Link>
                        </td>
                        <td className="text-xs">{application.job_title || 'Talent pool'}</td>
                        <td>
                          <StatusPill status={application.status} label={APPLICATION_STATUS_LABELS[application.status]} />
                        </td>
                        <td className="whitespace-nowrap text-xs text-navy-500">{timeAgo(application.created_at)}</td>
                      </tr>
                    ))}
                    {recentApplications.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-navy-500">
                          No applications yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {can('service_requests.view') && (
            <Panel title="Latest service requests" action={<QuickLink href="/dashboard/service-requests" label="All requests" />} padded={false}>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>From</th>
                      <th>Service</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <Link href={`/dashboard/service-requests/${request.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                            {request.reference}
                          </Link>
                        </td>
                        <td className="text-xs">{request.name}</td>
                        <td className="text-xs">{request.service || '—'}</td>
                        <td>
                          <StatusPill status={request.status} />
                        </td>
                      </tr>
                    ))}
                    {recentRequests.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-navy-500">
                          No requests yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <Panel title="At a glance">
            <dl className="space-y-3 text-sm">
              {[
                { label: 'Active projects', value: activeProjects, href: '/dashboard/projects', icon: FolderOpen },
                { label: 'Open service requests', value: openRequests, href: '/dashboard/service-requests', icon: FileText },
                { label: 'Published opportunities', value: opportunities, href: '/dashboard/opportunities', icon: Handshake },
                { label: 'Clients', value: clients, href: '/dashboard/clients', icon: Building2 },
                { label: 'Open vacancies', value: openJobs, href: '/dashboard/recruitment/jobs', icon: Briefcase },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-navy-600">
                    <item.icon size={15} className="text-navy-400" aria-hidden />
                    {item.label}
                  </dt>
                  <dd>
                    {item.href ? (
                      <Link href={item.href} className="font-semibold text-navy-900 hover:text-brand-600">
                        {item.value}
                      </Link>
                    ) : (
                      <span className="font-semibold text-navy-900">{item.value}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          {dueToday.length > 0 && (
            <Panel title="Due today">
              <ul className="space-y-3">
                {dueToday.map((task) => (
                  <li key={task.id}>
                    <Link href={`/dashboard/tasks/${task.id}`} className="text-sm font-medium text-navy-900 hover:text-brand-600">
                      {task.title}
                    </Link>
                    <div className="mt-1">
                      <StatusPill status={task.status} label={TASK_STATUS_LABELS[task.status]} />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {announcements.length > 0 && (
            <Panel title="Announcements">
              <ul className="space-y-4">
                {announcements.map((item) => (
                  <li key={item.id}>
                    <p className="text-sm font-semibold text-navy-900">{item.title}</p>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-navy-600">{item.body}</p>
                    <p className="mt-1 text-2xs text-navy-400">{formatDate(item.published_at)}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {can('team.monitor') && teamToday.length > 0 && (
            <Panel title="Team load" subtitle="Open · submitted · overdue" action={<QuickLink href="/dashboard/team" label="Team today" />}>
              <ul className="space-y-3">
                {teamToday.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar name={member.full_name} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-navy-900">{member.full_name}</span>
                        <span className="block truncate text-2xs text-navy-500">{member.job_title || member.role_name}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-1.5 text-2xs">
                      <span className="rounded-md bg-navy-50 px-1.5 py-0.5 text-navy-700">{member.open}</span>
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700">{member.submitted}</span>
                      <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-brand-700">{member.overdue}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
