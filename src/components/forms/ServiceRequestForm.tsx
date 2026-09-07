'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Upload } from 'lucide-react';
import { submitServiceRequest } from '@/app/actions/public';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, Select, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Submitting…' : 'Submit request'}
    </Button>
  );
}

export interface ServiceOption {
  id: number;
  name: string;
  division: string;
}

export function ServiceRequestForm({ services, preselected }: { services: ServiceOption[]; preselected?: number }) {
  const [state, action] = useActionState(submitServiceRequest, emptyActionState);

  if (state.ok) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          ✓
        </div>
        <h3 className="text-lg font-semibold text-navy-900">Request received</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-navy-600">{state.message}</p>
        {state.reference && (
          <p className="mt-4 inline-block rounded-lg bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy-800">
            Reference {state.reference}
          </p>
        )}
      </div>
    );
  }

  const divisions = Array.from(new Set(services.map((s) => s.division)));

  return (
    <form action={action} className="card space-y-5 p-6 sm:p-8" noValidate encType="multipart/form-data">
      <FormMessage state={state} />
      <FormRow>
        <Field label="Full name" htmlFor="sr-name" required error={state.errors?.name}>
          <TextInput id="sr-name" name="name" autoComplete="name" defaultValue={state.values?.name} error={!!state.errors?.name} required />
        </Field>
        <Field label="Company / organisation" htmlFor="sr-company" error={state.errors?.company}>
          <TextInput id="sr-company" name="company" autoComplete="organization" defaultValue={state.values?.company} />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="Email address" htmlFor="sr-email" required error={state.errors?.email}>
          <TextInput id="sr-email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={!!state.errors?.email} required />
        </Field>
        <Field label="Phone / WhatsApp" htmlFor="sr-phone" required error={state.errors?.phone}>
          <TextInput id="sr-phone" name="phone" type="tel" autoComplete="tel" defaultValue={state.values?.phone} error={!!state.errors?.phone} required />
        </Field>
      </FormRow>
      <Field label="Service required" htmlFor="sr-service" required error={state.errors?.service_id}>
        <Select id="sr-service" name="service_id" defaultValue={preselected ? String(preselected) : state.values?.service_id || ''} error={!!state.errors?.service_id} required>
          <option value="">Select a service…</option>
          {divisions.map((division) => (
            <optgroup key={division} label={division}>
              {services
                .filter((s) => s.division === division)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <FormRow>
        <Field label="Indicative budget" htmlFor="sr-budget" hint="Optional — a range is fine." error={state.errors?.budget}>
          <TextInput id="sr-budget" name="budget" placeholder="e.g. ZMW 5,000 – 10,000" defaultValue={state.values?.budget} />
        </Field>
        <Field label="Deadline" htmlFor="sr-deadline" hint="Optional" error={state.errors?.deadline}>
          <TextInput id="sr-deadline" name="deadline" type="date" defaultValue={state.values?.deadline} />
        </Field>
      </FormRow>
      <Field label="What do you need?" htmlFor="sr-description" required error={state.errors?.description}>
        <TextArea
          id="sr-description"
          name="description"
          rows={6}
          placeholder="Describe the work, who it is for and what success looks like."
          defaultValue={state.values?.description}
          error={!!state.errors?.description}
          required
        />
      </Field>
      <Field label="Supporting file" htmlFor="sr-attachment" hint="Optional — brief, images or documents (max 15 MB).">
        <label
          htmlFor="sr-attachment"
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-4 py-3 text-sm text-navy-600 transition hover:border-navy-300"
        >
          <Upload size={16} className="text-navy-400" aria-hidden />
          Choose a file…
          <input id="sr-attachment" name="attachment" type="file" className="sr-only" />
        </label>
      </Field>
      <CheckboxField
        id="sr-consent"
        name="consent"
        required
        error={state.errors?.consent}
        label="I agree that Seedwel Investment Limited may contact me about this request, as described in the Privacy Policy."
      />
      <SubmitButton />
    </form>
  );
}
