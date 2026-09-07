'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { registerAction } from '@/app/actions/auth';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextInput, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { checkPasswordStrength } from '@/lib/utils.client';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Creating account…' : 'Create account'}
    </Button>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, emptyActionState);
  const [accountType, setAccountType] = useState<'client' | 'applicant'>('client');
  const [password, setPassword] = useState('');
  const strength = password ? checkPasswordStrength(password) : null;

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <fieldset>
        <legend className="field-label">I am registering as</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'client', label: 'A business / client', hint: 'Request and follow work' },
            { value: 'applicant', label: 'A job seeker', hint: 'Apply and track applications' },
          ].map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                accountType === option.value
                  ? 'border-navy-900 bg-navy-50'
                  : 'border-navy-200 bg-white hover:border-navy-300'
              }`}
            >
              <input
                type="radio"
                name="account_type"
                value={option.value}
                checked={accountType === option.value}
                onChange={() => setAccountType(option.value as 'client' | 'applicant')}
                className="sr-only"
              />
              <span className="block text-sm font-medium text-navy-900">{option.label}</span>
              <span className="block text-xs text-navy-500">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <FormRow>
        <Field label="First name" htmlFor="reg-first" required error={state.errors?.first_name}>
          <TextInput id="reg-first" name="first_name" autoComplete="given-name" defaultValue={state.values?.first_name} error={!!state.errors?.first_name} required />
        </Field>
        <Field label="Last name" htmlFor="reg-last" required error={state.errors?.last_name}>
          <TextInput id="reg-last" name="last_name" autoComplete="family-name" defaultValue={state.values?.last_name} error={!!state.errors?.last_name} required />
        </Field>
      </FormRow>

      <Field label="Email address" htmlFor="reg-email" required error={state.errors?.email}>
        <TextInput id="reg-email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={!!state.errors?.email} required />
      </Field>

      <FormRow>
        <Field label="Phone / WhatsApp" htmlFor="reg-phone" error={state.errors?.phone}>
          <TextInput id="reg-phone" name="phone" type="tel" autoComplete="tel" defaultValue={state.values?.phone} />
        </Field>
        {accountType === 'client' && (
          <Field label="Company" htmlFor="reg-company" error={state.errors?.company}>
            <TextInput id="reg-company" name="company" autoComplete="organization" defaultValue={state.values?.company} />
          </Field>
        )}
      </FormRow>

      <Field label="Password" htmlFor="reg-password" required error={state.errors?.password} hint="At least 8 characters. Avoid common words.">
        <TextInput
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!state.errors?.password}
          required
        />
      </Field>
      {strength && (
        <div className="flex items-center gap-2" aria-live="polite">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-100">
            <div
              className={`h-full transition-all ${
                strength.score >= 4 ? 'bg-emerald-500' : strength.score >= 3 ? 'bg-amber-500' : 'bg-brand-500'
              }`}
              style={{ width: `${(strength.score / 4) * 100}%` }}
            />
          </div>
          <span className="text-2xs text-navy-500">
            {strength.score >= 4 ? 'Strong' : strength.score >= 3 ? 'Good' : 'Weak'}
          </span>
        </div>
      )}

      <Field label="Confirm password" htmlFor="reg-confirm" required error={state.errors?.confirm_password}>
        <TextInput id="reg-confirm" name="confirm_password" type="password" autoComplete="new-password" error={!!state.errors?.confirm_password} required />
      </Field>

      <CheckboxField
        id="reg-consent"
        name="consent"
        required
        error={state.errors?.consent}
        label={
          <>
            I accept the{' '}
            <a href="/legal/terms-and-conditions" className="font-medium text-brand-600 underline" target="_blank">
              Terms &amp; Conditions
            </a>{' '}
            and have read the{' '}
            <a href="/legal/privacy-policy" className="font-medium text-brand-600 underline" target="_blank">
              Privacy Policy
            </a>
            .
          </>
        }
      />

      <SubmitButton />
    </form>
  );
}
