'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { submitContact } from '@/app/actions/public';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Sending…' : children}
    </Button>
  );
}

export function ContactForm() {
  const [state, action] = useActionState(submitContact, emptyActionState);

  if (state.ok) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          ✓
        </div>
        <h3 className="text-lg font-semibold text-navy-900">Message sent</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-navy-600">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-5 p-6 sm:p-8" noValidate>
      <FormMessage state={state} />
      <FormRow>
        <Field label="Full name" htmlFor="contact-name" required error={state.errors?.name}>
          <TextInput
            id="contact-name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            defaultValue={state.values?.name}
            error={!!state.errors?.name}
            required
          />
        </Field>
        <Field label="Email address" htmlFor="contact-email" required error={state.errors?.email}>
          <TextInput
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            defaultValue={state.values?.email}
            error={!!state.errors?.email}
            required
          />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="Phone / WhatsApp" htmlFor="contact-phone" error={state.errors?.phone}>
          <TextInput
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+260 …"
            defaultValue={state.values?.phone}
          />
        </Field>
        <Field label="Subject" htmlFor="contact-subject" error={state.errors?.subject}>
          <TextInput
            id="contact-subject"
            name="subject"
            placeholder="How can we help?"
            defaultValue={state.values?.subject}
          />
        </Field>
      </FormRow>
      <Field label="Message" htmlFor="contact-message" required error={state.errors?.message}>
        <TextArea
          id="contact-message"
          name="message"
          rows={6}
          placeholder="Tell us what you need — include any deadlines."
          defaultValue={state.values?.message}
          error={!!state.errors?.message}
          required
        />
      </Field>
      <CheckboxField
        id="contact-consent"
        name="consent"
        required
        error={state.errors?.consent}
        label="I agree that Seedwel Investment Limited may use these details to respond to my enquiry, as described in the Privacy Policy."
      />
      <SubmitButton>Send message</SubmitButton>
    </form>
  );
}
