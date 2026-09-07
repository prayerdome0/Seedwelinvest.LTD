'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { resetPasswordAction } from '@/app/actions/auth';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, TextInput } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { checkPasswordStrength } from '@/lib/utils.client';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Updating…' : 'Update password'}
    </Button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, emptyActionState);
  const [password, setPassword] = useState('');
  const strength = password ? checkPasswordStrength(password) : null;

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="text-sm font-medium text-emerald-800">{state.message}</p>
        <a href="/login" className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
          Continue to sign in →
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <Field label="New password" htmlFor="reset-password" required error={state.errors?.password}>
        <TextInput
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!state.errors?.password}
          required
          autoFocus
        />
      </Field>
      {strength && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-100">
            <div
              className={`h-full transition-all ${
                strength.score >= 4 ? 'bg-emerald-500' : strength.score >= 3 ? 'bg-amber-500' : 'bg-brand-500'
              }`}
              style={{ width: `${(strength.score / 4) * 100}%` }}
            />
          </div>
          <span className="text-2xs text-navy-500">{strength.label}</span>
        </div>
      )}
      <Field label="Confirm new password" htmlFor="reset-confirm" required error={state.errors?.confirm_password}>
        <TextInput id="reset-confirm" name="confirm_password" type="password" autoComplete="new-password" error={!!state.errors?.confirm_password} required />
      </Field>
      <SubmitButton />
    </form>
  );
}
