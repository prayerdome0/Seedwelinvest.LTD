'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Upload } from 'lucide-react';
import { submitCvTalentPool } from '@/app/actions/public';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Sending…' : 'Join the talent pool'}
    </Button>
  );
}

export function CvTalentPoolForm() {
  const [state, action] = useActionState(submitCvTalentPool, emptyActionState);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="text-sm font-medium text-emerald-800">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate encType="multipart/form-data">
      <FormMessage state={state} />
      <FormRow>
        <Field label="Full name" htmlFor="talent-name" required error={state.errors?.name}>
          <TextInput id="talent-name" name="name" autoComplete="name" defaultValue={state.values?.name} error={!!state.errors?.name} required />
        </Field>
        <Field label="Email" htmlFor="talent-email" required error={state.errors?.email}>
          <TextInput id="talent-email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={!!state.errors?.email} required />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="Phone" htmlFor="talent-phone" required error={state.errors?.phone}>
          <TextInput id="talent-phone" name="phone" type="tel" defaultValue={state.values?.phone} error={!!state.errors?.phone} required />
        </Field>
        <Field label="Main skills" htmlFor="talent-skills" error={state.errors?.skills}>
          <TextInput id="talent-skills" name="skills" placeholder="e.g. Customer service, Data entry" defaultValue={state.values?.skills} />
        </Field>
      </FormRow>
      <Field label="Short note" htmlFor="talent-notes" hint="Optional" error={state.errors?.notes}>
        <TextArea id="talent-notes" name="notes" rows={3} defaultValue={state.values?.notes} />
      </Field>
      <Field label="CV" htmlFor="talent-cv" hint="PDF, Word or image — maximum 15 MB.">
        <label
          htmlFor="talent-cv"
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-4 py-3 text-sm text-navy-600 transition hover:border-navy-300"
        >
          <Upload size={16} className="text-navy-400" aria-hidden />
          Choose your CV…
          <input id="talent-cv" name="cv" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="sr-only" />
        </label>
      </Field>
      <CheckboxField
        id="talent-consent"
        name="consent"
        required
        error={state.errors?.consent}
        label="I consent to Seedwel Investment Limited keeping my details for future recruitment."
      />
      <SubmitButton />
    </form>
  );
}
