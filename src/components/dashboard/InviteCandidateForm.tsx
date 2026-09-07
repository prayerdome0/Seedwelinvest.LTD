'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, UserPlus } from 'lucide-react';
import { inviteCandidateAction } from '@/app/actions/recruitment';
import { emptyActionState } from '@/lib/forms';
import { Panel } from '@/components/dashboard/ui';
import { Field, FormMessage, TextInput, Select } from '@/components/ui/FormField';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {pending ? 'Sending…' : 'Send invitation'}
    </button>
  );
}

export function InviteCandidateForm({
  applicationId,
  roles,
  managers,
  defaultJobTitle,
}: {
  applicationId: number;
  roles: { key: string; name: string }[];
  managers: { id: number; name: string }[];
  defaultJobTitle: string;
}) {
  const [state, action] = useActionState(inviteCandidateAction, emptyActionState);

  return (
    <Panel title="Invite to join" subtitle="Creates the account and emails a secure registration link">
      <form action={action} className="space-y-3">
        <input type="hidden" name="application_id" value={applicationId} />
        <FormMessage state={state} />
        <Field label="Role" htmlFor="invite-role" required error={state.errors?.role_key}>
          <Select id="invite-role" name="role_key" defaultValue="staff" error={!!state.errors?.role_key} required>
            {roles.map((role) => (
              <option key={role.key} value={role.key}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Job title" htmlFor="invite-title">
          <TextInput id="invite-title" name="job_title" defaultValue={defaultJobTitle} />
        </Field>
        <Field label="Reports to" htmlFor="invite-manager">
          <Select id="invite-manager" name="manager_id" defaultValue="">
            <option value="">No manager yet</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </Select>
        </Field>
        <Submit />
      </form>
      <p className="mt-3 flex items-start gap-2 text-2xs leading-relaxed text-navy-500">
        <UserPlus size={13} className="mt-0.5 shrink-0" aria-hidden />
        The candidate sets their own password. Account activation and staff registration complete the onboarding process.
      </p>
    </Panel>
  );
}
