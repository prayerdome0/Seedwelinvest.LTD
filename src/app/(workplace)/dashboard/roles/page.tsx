import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { ROLE_DEFINITIONS, PERMISSIONS, PERMISSION_KEYS, PERMISSION_CATEGORIES } from '@/lib/rbac';
import { RolePermissionsForm } from '@/components/dashboard/RolePermissionsForm';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  const user = await requirePermission('roles.manage', '/dashboard/roles');
  const canManage = user.permissions.includes('roles.manage') || user.permissions.includes('system.super');

  const stored = queryAll<{ role_key: string; permission: string }>('SELECT role_key, permission FROM role_permissions');
  const byRole = stored.reduce<Record<string, string[]>>((acc, row) => {
    acc[row.role_key] = acc[row.role_key] || [];
    acc[row.role_key].push(row.permission);
    return acc;
  }, {});

  const counts = queryAll<{ role_key: string; c: number }>("SELECT role_key, COUNT(*) AS c FROM users WHERE status != 'disabled' GROUP BY role_key");

  const groups = PERMISSION_CATEGORIES.map((category) => ({
    category,
    permissions: PERMISSIONS.filter((p) => p.category === category),
  }));

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        subtitle="Every role is defined in code and stored in the database. Adjust what each role can do without touching the application."
      />

      <div className="space-y-5">
        {ROLE_DEFINITIONS.map((role) => {
          const active = new Set(byRole[role.key] ?? role.permissions);
          const memberCount = counts.find((c) => c.role_key === role.key)?.c ?? 0;
          return (
            <Panel
              key={role.key}
              title={role.name}
              subtitle={`${role.description} · ${memberCount} member${memberCount === 1 ? '' : 's'}`}
              action={
                role.key === 'super_admin' ? (
                  <span className="chip">Full access — always</span>
                ) : (
                  <span className="chip">{active.size} permissions</span>
                )
              }
            >
              {role.key === 'super_admin' ? (
                <p className="text-sm leading-relaxed text-navy-600">
                  The Super Admin role always has every permission and cannot be reduced. Only another Super Admin can
                  assign it.
                </p>
              ) : (
                <RolePermissionsForm
                  roleKey={role.key}
                  active={Array.from(active)}
                  groups={groups}
                  allPermissions={PERMISSION_KEYS}
                  canManage={canManage}
                />
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
