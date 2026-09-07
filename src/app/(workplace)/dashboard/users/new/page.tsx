import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { UserForm } from '@/components/dashboard/UserForm';
import { ROLE_DEFINITIONS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function NewUserPage() {
  const user = await requirePermission('users.create', '/dashboard/users/new');

  const departments = queryAll<{ id: number; name: string }>('SELECT id, name FROM departments ORDER BY name');
  const managers = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' AND role_key NOT IN ('client','applicant') ORDER BY first_name",
  );
  const roles = ROLE_DEFINITIONS.filter((r) => r.key !== 'super_admin' || user.permissions.includes('system.super'));

  return (
    <>
      <PageHeader
        title="Add a person"
        subtitle="Create an account for a staff member, manager, client or applicant."
        breadcrumb={[{ label: 'People', href: '/dashboard/users' }, { label: 'New' }]}
        actions={
          <Link href="/dashboard/users" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
            Back to people
          </Link>
        }
      />
      <div className="max-w-3xl">
        <UserForm
          roles={roles}
          departments={departments}
          managers={managers}
          canAssignRoles={user.permissions.includes('users.assign_role') || user.permissions.includes('system.super')}
        />
      </div>
    </>
  );
}
