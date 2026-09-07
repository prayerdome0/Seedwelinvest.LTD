import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KeyRound, Mail, Phone, ShieldCheck, Trash2 } from 'lucide-react';
import { PageHeader, Panel, StatCard } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, StatusPill } from '@/components/ui/Badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import { ROLE_DEFINITIONS, TASK_STATUS_LABELS } from '@/lib/rbac';
import { InlineActionForm, ActionForm } from '@/components/dashboard/forms';
import { setUserStatusAction, resetUserPasswordAction, deleteUserAction, uploadAvatarAction } from '@/app/actions/admin';
import { resendInvitationAction as resendFromRecruitment } from '@/app/actions/recruitment';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePermission('users.view', '/dashboard/users');
  const { id } = await params;
  const userId = Number(id);

  const person = queryOne<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role_key: string;
    role_name: string;
    job_title: string;
    employment_type: string;
    location: string;
    status: string;
    department: string | null;
    department_id: number | null;
    manager: string | null;
    avatar_path: string | null;
    joined_at: string | null;
    last_login_at: string | null;
    created_at: string;
    bio: string;
  }>(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role_key, r.name AS role_name, u.job_title,
            u.employment_type, u.location, u.status, d.name AS department, u.department_id,
            (SELECT TRIM(m.first_name || ' ' || m.last_name) FROM users m WHERE m.id = u.manager_id) AS manager,
            u.avatar_path, u.joined_at, u.last_login_at, u.created_at, u.bio
       FROM users u LEFT JOIN roles r ON r.key = u.role_key LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id = ?`,
    [userId],
  );

  if (!person) notFound();

  const superAdmin = viewer.permissions.includes('system.super');
  const canUpdate = viewer.permissions.includes('users.update') || superAdmin;
  const canDisable = viewer.permissions.includes('users.disable') || superAdmin;
  const canReset = viewer.permissions.includes('users.reset_password') || superAdmin;
  const canDelete = viewer.permissions.includes('users.delete') || superAdmin;

  const tasks = queryAll<{ id: number; title: string; status: string; due_date: string | null }>(
    `SELECT t.id, t.title, t.status, t.due_date FROM tasks t
      JOIN task_assignees a ON a.task_id = t.id AND a.user_id = ?
     ORDER BY t.status = 'approved', COALESCE(t.due_date, '9999-12-31') ASC LIMIT 10`,
    [userId],
  );

  const taskStats = queryOne<{ total: number; approved: number; late: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN t.status = 'approved' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN t.due_date IS NOT NULL AND t.due_date < date('now') AND t.status NOT IN ('approved','cancelled') THEN 1 ELSE 0 END) AS late
       FROM tasks t JOIN task_assignees a ON a.task_id = t.id AND a.user_id = ?`,
    [userId],
  );

  const documents = queryAll<{ id: number; name: string; category: string; created_at: string }>(
    'SELECT id, name, category, created_at FROM documents WHERE owner_id = ? ORDER BY created_at DESC LIMIT 10',
    [userId],
  );

  const recentAudit = viewer.permissions.includes('audit.view')
    ? queryAll<{ id: number; action: string; created_at: string }>(
        'SELECT id, action, created_at FROM audit_logs WHERE actor_id = ? ORDER BY created_at DESC LIMIT 8',
        [userId],
      )
    : [];

  const roleDefinition = ROLE_DEFINITIONS.find((r) => r.key === person.role_key);

  return (
    <>
      <PageHeader
        title={`${person.first_name} ${person.last_name}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={person.status === 'active' ? 'success' : person.status === 'invited' ? 'warning' : 'danger'}>{person.status}</Badge>
            <span>{person.role_name}</span>
            {person.job_title && <span className="text-navy-400">· {person.job_title}</span>}
          </span>
        }
        breadcrumb={[{ label: 'People', href: '/dashboard/users' }, { label: `${person.first_name} ${person.last_name}` }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canUpdate && (
              <Link href={`/dashboard/users/${userId}/edit`} className="inline-flex items-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
                Edit profile
              </Link>
            )}
            {person.status === 'invited' && (canUpdate || superAdmin) && (
              <InlineActionForm action={resendFromRecruitment} fields={{ user_id: userId }} label="Resend invitation" variant="outline" />
            )}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <Panel title="Profile">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={`${person.first_name} ${person.last_name}`} src={person.avatar_path} size={72} />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-navy-900">
                  {person.first_name} {person.last_name}
                </p>
                <p className="text-sm text-navy-600">{person.email}</p>
                <p className="text-xs text-navy-500">
                  {person.job_title || person.role_name}
                  {person.department ? ` · ${person.department}` : ''}
                </p>
              </div>
            </div>
            {person.bio && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-navy-600">{person.bio}</p>
            )}
            <dl className="mt-5 grid gap-3 border-t border-navy-100 pt-4 text-sm sm:grid-cols-2">
              {[
                { label: 'Phone', value: person.phone || '—' },
                { label: 'Location', value: person.location || '—' },
                { label: 'Employment type', value: person.employment_type || '—' },
                { label: 'Reports to', value: person.manager || '—' },
                { label: 'Joined', value: person.joined_at ? formatDate(person.joined_at) : '—' },
                { label: 'Last login', value: person.last_login_at ? formatDateTime(person.last_login_at) : 'Never' },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">{row.label}</dt>
                  <dd className="mt-0.5 text-navy-800">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Assigned tasks" subtitle={`${taskStats?.total ?? 0} total · ${taskStats?.approved ?? 0} approved · ${taskStats?.late ?? 0} late`}>
            {tasks.length === 0 ? (
              <p className="py-3 text-sm text-navy-500">No tasks assigned.</p>
            ) : (
              <ul className="divide-y divide-navy-100">
                {tasks.map((task) => (
                  <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <Link href={`/dashboard/tasks/${task.id}`} className="truncate text-sm font-medium text-navy-900 hover:text-brand-600">
                      {task.title}
                    </Link>
                    <StatusPill status={task.status} label={TASK_STATUS_LABELS[task.status]} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {documents.length > 0 && (
            <Panel title="Documents">
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-navy-700">{doc.name}</span>
                    <a href={`/api/documents/${doc.id}`} className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700">
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Assigned" value={taskStats?.total ?? 0} />
            <StatCard label="Late" value={taskStats?.late ?? 0} tone={(taskStats?.late ?? 0) > 0 ? 'warning' : 'soft'} />
          </div>

          {roleDefinition && (
            <Panel title="Role & permissions">
              <p className="text-sm font-semibold text-navy-900">{roleDefinition.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-navy-600">{roleDefinition.description}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {roleDefinition.permissions.slice(0, 14).map((permission) => (
                  <li key={permission} className="rounded-md bg-navy-50 px-2 py-0.5 text-2xs text-navy-600">
                    {permission}
                  </li>
                ))}
                {roleDefinition.permissions.length > 14 && (
                  <li className="rounded-md bg-navy-50 px-2 py-0.5 text-2xs text-navy-500">
                    +{roleDefinition.permissions.length - 14} more
                  </li>
                )}
              </ul>
              <Link href="/dashboard/roles" className="mt-4 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
                Manage role permissions →
              </Link>
            </Panel>
          )}

          <Panel title="Account actions">
            <div className="space-y-3">
              {canReset && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm text-navy-700">
                    <KeyRound size={15} className="text-navy-400" aria-hidden /> Send a password reset link
                  </span>
                  <InlineActionForm action={resetUserPasswordAction} fields={{ id: userId }} label="Send reset link" variant="outline" />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-navy-700">
                  <Mail size={15} className="text-navy-400" aria-hidden /> Email {person.email}
                </span>
                <a href={`mailto:${person.email}`} className="inline-flex items-center rounded-xl border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-900 hover:bg-navy-50">
                  Compose
                </a>
              </div>
              {person.phone && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm text-navy-700">
                    <Phone size={15} className="text-navy-400" aria-hidden /> {person.phone}
                  </span>
                  <a href={`tel:${person.phone.replace(/\s/g, '')}`} className="inline-flex items-center rounded-xl border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-900 hover:bg-navy-50">
                    Call
                  </a>
                </div>
              )}

              {canDisable && userId !== viewer.id && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 pt-3">
                  <span className="flex items-center gap-2 text-sm text-navy-700">
                    <ShieldCheck size={15} className="text-navy-400" aria-hidden />
                    {person.status === 'disabled' ? 'Reactivate account' : 'Disable account'}
                  </span>
                  <InlineActionForm
                    action={setUserStatusAction}
                    fields={{ id: userId, status: person.status === 'disabled' ? 'active' : 'disabled' }}
                    label={person.status === 'disabled' ? 'Reactivate' : 'Disable'}
                    confirm={person.status === 'disabled' ? undefined : 'Disable this account? They will be signed out and cannot sign in again until reactivated.'}
                    variant="outline"
                  />
                </div>
              )}

              {canDelete && userId !== viewer.id && (person.role_key !== 'super_admin' || superAdmin) && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 pt-3">
                  <span className="flex items-center gap-2 text-sm text-brand-700">
                    <Trash2 size={15} aria-hidden /> Delete permanently
                  </span>
                  <InlineActionForm
                    action={deleteUserAction}
                    fields={{ id: userId }}
                    label="Delete"
                    confirm={`Permanently delete ${person.first_name} ${person.last_name}? This cannot be undone.`}
                    variant="danger"
                  />
                </div>
              )}
            </div>
          </Panel>

          {recentAudit.length > 0 && (
            <Panel title="Recent activity">
              <ul className="space-y-2">
                {recentAudit.map((entry) => (
                  <li key={entry.id} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate text-navy-700">{entry.action}</span>
                    <span className="shrink-0 text-navy-400">{formatDateTime(entry.created_at)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <ActionForm
            action={uploadAvatarAction}
            submitLabel="Upload photo"
            variant="outline"
            formClassName="flex flex-wrap items-center gap-3 rounded-2xl border border-navy-100 bg-white p-4"
          >
            <input type="hidden" name="user_id" value={userId} />
            <input type="file" name="avatar" accept="image/*" className="block w-full max-w-[200px] text-xs text-navy-600 file:mr-2 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-1.5 file:text-xs file:text-white" />
          </ActionForm>
        </div>
      </div>
    </>
  );
}
