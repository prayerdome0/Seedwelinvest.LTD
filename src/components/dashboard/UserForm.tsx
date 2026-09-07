'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { saveUserAction } from '@/app/actions/admin';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, Select, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {pending ? 'Saving…' : label}
    </Button>
  );
}

export interface RoleOption {
  key: string;
  name: string;
  description: string;
}
export interface SimpleOption {
  id: number;
  name: string;
}

export interface UserDefaults {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role_key?: string;
  department_id?: number | null;
  manager_id?: number | null;
  job_title?: string;
  employment_type?: string;
  location?: string;
  status?: string;
  bio?: string;
}

export function UserForm({
  roles,
  departments,
  managers,
  defaults,
  canAssignRoles,
  isSelf,
}: {
  roles: RoleOption[];
  departments: SimpleOption[];
  managers: SimpleOption[];
  defaults?: UserDefaults;
  canAssignRoles: boolean;
  isSelf?: boolean;
}) {
  const [state, action] = useActionState(saveUserAction, emptyActionState);

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="card p-5">
        <FormRow>
          <Field label="First name" htmlFor="user-first" required error={state.errors?.first_name}>
            <TextInput id="user-first" name="first_name" defaultValue={defaults?.first_name} error={!!state.errors?.first_name} required />
          </Field>
          <Field label="Last name" htmlFor="user-last" required error={state.errors?.last_name}>
            <TextInput id="user-last" name="last_name" defaultValue={defaults?.last_name} error={!!state.errors?.last_name} required />
          </Field>
        </FormRow>
        <FormRow className="mt-4">
          <Field label="Email address" htmlFor="user-email" required error={state.errors?.email}>
            <TextInput id="user-email" name="email" type="email" autoComplete="email" defaultValue={defaults?.email} error={!!state.errors?.email} required />
          </Field>
          <Field label="Phone" htmlFor="user-phone" error={state.errors?.phone}>
            <TextInput id="user-phone" name="phone" type="tel" defaultValue={defaults?.phone} />
          </Field>
        </FormRow>
        <div className="mt-4">
          <Field label="Town / city" htmlFor="user-location">
            <TextInput id="user-location" name="location" defaultValue={defaults?.location} placeholder="e.g. Lusaka" />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <FormRow>
          <Field label="Role" htmlFor="user-role" required error={state.errors?.role_key}>
            <Select id="user-role" name="role_key" defaultValue={defaults?.role_key || 'staff'} disabled={!canAssignRoles} error={!!state.errors?.role_key} required>
              {roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </Select>
            {!canAssignRoles && <p className="field-hint">You do not have permission to change roles.</p>}
          </Field>
          <Field label="Employment type" htmlFor="user-employment">
            <Select id="user-employment" name="employment_type" defaultValue={defaults?.employment_type || 'Full-time'}>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
              <option value="Consultant">Consultant</option>
            </Select>
          </Field>
        </FormRow>
        <FormRow className="mt-4">
          <Field label="Job title" htmlFor="user-title">
            <TextInput id="user-title" name="job_title" defaultValue={defaults?.job_title} placeholder="e.g. Operations Manager" />
          </Field>
          <Field label="Department" htmlFor="user-department">
            <Select id="user-department" name="department_id" defaultValue={defaults?.department_id ? String(defaults.department_id) : ''}>
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>
        </FormRow>
        <div className="mt-4">
          <Field label="Reports to" htmlFor="user-manager">
            <Select id="user-manager" name="manager_id" defaultValue={defaults?.manager_id ? String(defaults.manager_id) : ''}>
              <option value="">No manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <Field label="Status" htmlFor="user-status" error={state.errors?.status}>
          <Select id="user-status" name="status" defaultValue={defaults?.status || 'active'} disabled={isSelf}>
            <option value="active">Active</option>
            <option value="invited">Invited (pending registration)</option>
            <option value="disabled">Disabled</option>
          </Select>
          {isSelf && <p className="field-hint">Ask another administrator to change your own status.</p>}
        </Field>
        <div className="mt-4">
          <Field label="Short bio" htmlFor="user-bio">
            <TextArea id="user-bio" name="bio" rows={3} defaultValue={defaults?.bio} />
          </Field>
        </div>
        {!defaults?.id && (
          <div className="mt-4">
            <CheckboxField
              id="user-invite"
              name="send_invite"
              label="Email this person an invitation link so they can set their own password"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Submit label={defaults?.id ? 'Save changes' : 'Create person'} />
        <Link
          href={defaults?.id ? `/dashboard/users/${defaults.id}` : '/dashboard/users'}
          className="inline-flex items-center rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
