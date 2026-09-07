'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { submitOpportunityInterest } from '@/app/actions/public';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Sending…' : label}
    </Button>
  );
}

export function OpportunityInterestForm({ opportunityId, ctaLabel }: { opportunityId: number; ctaLabel: string }) {
  const [state, action] = useActionState(submitOpportunityInterest, emptyActionState);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-medium text-emerald-800">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="opportunity_id" value={opportunityId} />
      <FormMessage state={state} />
      <FormRow>
        <Field label="Full name" htmlFor="oi-name" required error={state.errors?.name}>
          <TextInput id="oi-name" name="name" autoComplete="name" defaultValue={state.values?.name} error={!!state.errors?.name} required />
        </Field>
        <Field label="Email address" htmlFor="oi-email" required error={state.errors?.email}>
          <TextInput id="oi-email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={!!state.errors?.email} required />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="Phone" htmlFor="oi-phone" error={state.errors?.phone}>
          <TextInput id="oi-phone" name="phone" type="tel" defaultValue={state.values?.phone} />
        </Field>
        <Field label="Organisation" htmlFor="oi-org" error={state.errors?.organisation}>
          <TextInput id="oi-org" name="organisation" autoComplete="organization" defaultValue={state.values?.organisation} />
        </Field>
      </FormRow>
      <Field label="Message" htmlFor="oi-message" required error={state.errors?.message}>
        <TextArea
          id="oi-message"
          name="message"
          rows={5}
          placeholder="Tell us about your interest, your capacity and what you would like to discuss."
          defaultValue={state.values?.message}
          error={!!state.errors?.message}
          required
        />
      </Field>
      <CheckboxField
        id="oi-consent"
        name="consent"
        required
        error={state.errors?.consent}
        label="I consent to Seedwel Investment Limited using these details to respond to my enquiry."
      />
      <SubmitButton label={ctaLabel} />
    </form>
  );
}
