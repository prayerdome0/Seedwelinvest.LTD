'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { forgotPasswordAction } from '@/app/actions/auth';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, TextInput } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Sending…' : 'Send reset link'}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, emptyActionState);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="text-sm font-medium text-emerald-800">{state.message}</p>
        <p className="mt-2 text-xs text-emerald-700">
          In this deployment, sent messages appear in Admin → Settings → Email outbox.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Email address" htmlFor="forgot-email" required error={state.errors?.email}>
        <TextInput id="forgot-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" error={!!state.errors?.email} required autoFocus />
      </Field>
      <SubmitButton />
    </form>
  );
}
