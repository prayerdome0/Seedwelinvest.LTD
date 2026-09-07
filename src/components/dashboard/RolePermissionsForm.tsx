'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { saveRolePermissionsAction, resetRolePermissionsAction } from '@/app/actions/admin';
import { emptyActionState } from '@/lib/forms';

function Button({ label, variant }: { label: string; variant?: 'ghost' }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        variant === 'ghost'
          ? 'inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-700 hover:bg-navy-50 disabled:opacity-60'
          : 'inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60'
      }
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {pending ? 'Saving…' : label}
    </button>
  );
}

export function RolePermissionsForm({
  roleKey,
  active,
  groups,
  allPermissions,
  canManage,
}: {
  roleKey: string;
  active: string[];
  groups: { category: string; permissions: { key: string; label: string; description: string }[] }[];
  allPermissions: string[];
  canManage: boolean;
}) {
  const [state, action] = useActionState(saveRolePermissionsAction, emptyActionState);
  const [resetState, resetAction] = useActionState(resetRolePermissionsAction, emptyActionState);
  const activeSet = new Set(active);

  return (
    <div>
      <form action={action}>
        <input type="hidden" name="role_key" value={roleKey} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <fieldset key={group.category} className="rounded-xl border border-navy-100 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-navy-500">{group.category}</legend>
              <ul className="mt-2 space-y-1.5">
                {group.permissions.map((permission) => (
                  <li key={permission.key}>
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-navy-700">
                      <input
                        type="checkbox"
                        name="permissions"
                        value={permission.key}
                        defaultChecked={activeSet.has(permission.key)}
                        disabled={!canManage}
                        className="mt-0.5 h-4 w-4 rounded border-navy-300"
                      />
                      <span>
                        <span className="block font-medium text-navy-800">{permission.label}</span>
                        <span className="block text-2xs text-navy-500">{permission.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>

        <p className="mt-3 text-2xs text-navy-500">
          {allPermissions.length} permissions available in the system.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button label="Save permissions" />
          {state.message && (
            <span className={`text-xs ${state.ok ? 'text-emerald-700' : 'text-brand-700'}`} role="status">
              {state.message}
            </span>
          )}
        </div>
      </form>

      <form action={resetAction} className="mt-3 border-t border-navy-100 pt-3">
        <input type="hidden" name="role_key" value={roleKey} />
        <div className="flex flex-wrap items-center gap-3">
          <Button label="Restore defaults" variant="ghost" />
          {resetState.message && <span className="text-xs text-emerald-700">{resetState.message}</span>}
        </div>
      </form>
    </div>
  );
}
