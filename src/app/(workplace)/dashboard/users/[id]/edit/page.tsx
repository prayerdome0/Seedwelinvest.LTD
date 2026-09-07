import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { UserForm } from '@/components/dashboard/UserForm';
import { ROLE_DEFINITIONS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePermission('users.update', '/dashboard/users');
  const { id } = await params;
  const userId = Number(id);

  const person = queryOne<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role_key: string;
    job_title: string;
    employment_type: string;
    location: string;
    status: string;
    department_id: number | null;
    manager_id: number | null;
    bio: string;
  }>(
    'SELECT id, first_name, last_name, email, phone, role_key, job_title, employment_type, location, status, department_id, manager_id, bio FROM users WHERE id = ?',
    [userId],
  );
  if (!person) notFound();

  const superAdmin = viewer.permissions.includes('system.super');
  if (person.role_key === 'super_admin' && !superAdmin) notFound();

  const departments = queryAll<{ id: number; name: string }>('SELECT id, name FROM departments ORDER BY name');
  const managers = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' AND id != ? ORDER BY first_name",
    [userId],
  );
  const roles = ROLE_DEFINITIONS.filter((r) => r.key !== 'super_admin' || superAdmin);

  return (
    <>
      <PageHeader
        title="Edit person"
        subtitle={`${person.first_name} ${person.last_name} · ${person.email}`}
        breadcrumb={[{ label: 'People', href: '/dashboard/users' }, { label: 'Edit' }]}
        actions={
          <Link href={`/dashboard/users/${userId}`} className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
            Back to profile
          </Link>
        }
      />
      <div className="max-w-3xl">
        <UserForm
          roles={roles}
          departments={departments}
          managers={managers}
          canAssignRoles={viewer.permissions.includes('users.assign_role') || superAdmin}
          isSelf={userId === viewer.id}
          defaults={{
            id: person.id,
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            phone: person.phone,
            role_key: person.role_key,
            job_title: person.job_title,
            employment_type: person.employment_type,
            location: person.location,
            status: person.status,
            department_id: person.department_id,
            manager_id: person.manager_id,
            bio: person.bio,
          }}
        />
      </div>
    </>
  );
}
