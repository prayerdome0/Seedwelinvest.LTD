'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { changePasswordAction } from '@/app/actions/auth';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, TextInput } from '@/components/ui/FormField';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60"
    >
      {pending && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {pending ? 'Updating…' : 'Change password'}
    </button>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, emptyActionState);

  return (
    <form action={action} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <Field label="Current password" htmlFor="current-password" required error={state.errors?.current_password}>
        <TextInput id="current-password" name="current_password" type="password" autoComplete="current-password" error={!!state.errors?.current_password} required />
      </Field>
      <Field label="New password" htmlFor="new-password" required error={state.errors?.new_password} hint="At least 8 characters.">
        <TextInput id="new-password" name="new_password" type="password" autoComplete="new-password" error={!!state.errors?.new_password} required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm-password" required error={state.errors?.confirm_password}>
        <TextInput id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" error={!!state.errors?.confirm_password} required />
      </Field>
      <Submit />
    </form>
  );
}
