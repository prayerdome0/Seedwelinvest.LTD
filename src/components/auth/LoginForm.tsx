'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, TextInput } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, emptyActionState);

  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <Field label="Email address" htmlFor="login-email" required>
        <TextInput
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          defaultValue={state.values?.email}
          error={!!state.errors?.email}
          required
          autoFocus
        />
      </Field>
      <Field label="Password" htmlFor="login-password" required error={state.errors?.password}>
        <TextInput
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={!!state.errors?.password}
          required
        />
      </Field>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-navy-500">Keep me signed in on this device</span>
        <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          Forgot password?
        </Link>
      </div>

      <SubmitButton />
    </form>
  );
}
