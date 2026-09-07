import { PageHeader, Panel, EmptyRow, TableWrap } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { InlineActionForm, ActionForm } from '@/components/dashboard/forms';
import { saveDepartmentAction, deleteDepartmentAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage() {
  await requirePermission('departments.manage', '/dashboard/departments');

  const departments = queryAll<{ id: number; name: string; description: string; head_user_id: number | null; members: number; head_name: string | null }>(
    `SELECT d.id, d.name, d.description, d.head_user_id,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) AS members,
            (SELECT TRIM(first_name || ' ' || last_name) FROM users u WHERE u.id = d.head_user_id) AS head_name
       FROM departments d ORDER BY d.name`,
  );

  const staff = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' AND role_key NOT IN ('client','applicant') ORDER BY first_name",
  );

  return (
    <>
      <PageHeader title="Departments" subtitle="Structure the company so work, people and reporting lines make sense." />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Panel padded={false}>
          <TableWrap className="rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Head</th>
                  <th>Members</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {departments.map((department) => (
                  <tr key={department.id}>
                    <td>
                      <span className="block font-medium text-navy-900">{department.name}</span>
                      {department.description && <span className="block text-xs text-navy-500">{department.description}</span>}
                    </td>
                    <td className="text-xs text-navy-600">{department.head_name || '—'}</td>
                    <td className="text-xs text-navy-600">{department.members}</td>
                    <td className="text-right">
                      <InlineActionForm
                        action={deleteDepartmentAction}
                        fields={{ id: department.id }}
                        label="Delete"
                        confirm={`Delete the ${department.name} department?`}
                        variant="ghost"
                      />
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && <EmptyRow colSpan={4}>No departments yet.</EmptyRow>}
              </tbody>
            </table>
          </TableWrap>
        </Panel>

        <Panel title="Add a department">
          <ActionForm action={saveDepartmentAction} submitLabel="Create department" formClassName="space-y-3">
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Name</span>
              <input name="name" className="field-input" required placeholder="e.g. Digital Solutions" />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Description</span>
              <textarea name="description" rows={3} className="field-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Head of department</span>
              <select name="head_user_id" className="field-input" defaultValue="">
                <option value="">Not set</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          </ActionForm>

          <div className="mt-6 border-t border-navy-100 pt-5">
            <p className="text-sm font-semibold text-navy-900">Edit an existing department</p>
            <p className="mt-1 text-xs text-navy-600">
              Re-submit the form with the same name to update it, then reassign its head below.
            </p>
            <div className="mt-3 space-y-3">
              {departments.map((department) => (
                <ActionForm
                  key={department.id}
                  action={saveDepartmentAction}
                  submitLabel={`Save ${department.name}`}
                  variant="outline"
                  size="sm"
                  formClassName="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="id" value={department.id} />
                  <input type="hidden" name="name" value={department.name} />
                  <input type="hidden" name="description" value={department.description} />
                  <select name="head_user_id" className="field-input h-9 max-w-[220px] py-1 text-xs" defaultValue={department.head_user_id ?? ''}>
                    <option value="">No head</option>
                    {staff.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </ActionForm>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
