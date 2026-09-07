'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { acceptInvitationAction } from '@/app/actions/auth';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextInput, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { checkPasswordStrength } from '@/lib/utils.client';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Setting up…' : 'Create password and continue'}
    </Button>
  );
}

export function AcceptInvitationForm({
  token,
  defaults,
}: {
  token: string;
  defaults: { email: string; first_name: string; last_name: string };
}) {
  const [state, action] = useActionState(acceptInvitationAction, emptyActionState);
  const [password, setPassword] = useState('');
  const strength = password ? checkPasswordStrength(password) : null;

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />

      <Field label="Email address" htmlFor="invite-email">
        <TextInput id="invite-email" name="display_email" value={defaults.email} disabled readOnly className="bg-navy-50" />
        <input type="hidden" name="email" value={defaults.email} />
      </Field>

      <FormRow>
        <Field label="First name" htmlFor="invite-first" required error={state.errors?.first_name}>
          <TextInput id="invite-first" name="first_name" defaultValue={state.values?.first_name || defaults.first_name} error={!!state.errors?.first_name} required />
        </Field>
        <Field label="Last name" htmlFor="invite-last" required error={state.errors?.last_name}>
          <TextInput id="invite-last" name="last_name" defaultValue={state.values?.last_name || defaults.last_name} error={!!state.errors?.last_name} required />
        </Field>
      </FormRow>

      <FormRow>
        <Field label="Phone number" htmlFor="invite-phone" required error={state.errors?.phone}>
          <TextInput id="invite-phone" name="phone" type="tel" defaultValue={state.values?.phone} error={!!state.errors?.phone} required />
        </Field>
        <Field label="Town / city" htmlFor="invite-location" error={state.errors?.location}>
          <TextInput id="invite-location" name="location" placeholder="e.g. Lusaka" defaultValue={state.values?.location} />
        </Field>
      </FormRow>

      <div className="rounded-xl border border-navy-100 bg-navy-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Emergency contact</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextInput
            id="invite-emergency-name"
            name="emergency_name"
            placeholder="Full name"
            aria-label="Emergency contact name"
            defaultValue={state.values?.emergency_name}
          />
          <TextInput
            id="invite-emergency-phone"
            name="emergency_phone"
            placeholder="Phone number"
            aria-label="Emergency contact phone"
            defaultValue={state.values?.emergency_phone}
          />
        </div>
        <p className="mt-2 text-2xs text-navy-500">
          Used only to contact someone on your behalf in an emergency. You can complete it later in your profile.
        </p>
      </div>

      <Field label="Password" htmlFor="invite-password" required error={state.errors?.password}>
        <TextInput
          id="invite-password"
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

      <Field label="Confirm password" htmlFor="invite-confirm" required error={state.errors?.confirm_password}>
        <TextInput id="invite-confirm" name="confirm_password" type="password" autoComplete="new-password" error={!!state.errors?.confirm_password} required />
      </Field>

      <CheckboxField
        id="invite-consent"
        name="consent"
        required
        label="I confirm these details are correct and accept the Terms & Conditions and Privacy Policy."
      />

      <SubmitButton />
    </form>
  );
}
