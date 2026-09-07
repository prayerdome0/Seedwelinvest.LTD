'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Upload } from 'lucide-react';
import { submitApplication } from '@/app/actions/public';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Submitting…' : 'Submit application'}
    </Button>
  );
}

export function ApplicationForm({
  jobId,
  jobTitle,
  defaultCountry = 'Zambia',
}: {
  jobId: number;
  jobTitle: string;
  defaultCountry?: string;
}) {
  const [state, action] = useActionState(submitApplication, emptyActionState);

  if (state.ok) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          ✓
        </div>
        <h2 className="text-xl font-semibold text-navy-900">Application Received</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-navy-600">{state.message}</p>
        {state.reference && (
          <p className="mt-4 inline-block rounded-lg bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy-800">
            Reference {state.reference}
          </p>
        )}
        <p className="mx-auto mt-5 max-w-md text-xs leading-relaxed text-navy-500">
          Keep your reference number. Our recruitment team reviews every application and will contact you directly if you
          are shortlisted.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate encType="multipart/form-data">
      <input type="hidden" name="job_id" value={jobId} />
      <FormMessage state={state} />

      <fieldset className="card p-6">
        <legend className="px-1 text-sm font-semibold text-navy-900">Your details</legend>
        <div className="mt-3 space-y-5">
          <FormRow>
            <Field label="First name" htmlFor="app-first" required error={state.errors?.first_name}>
              <TextInput id="app-first" name="first_name" autoComplete="given-name" defaultValue={state.values?.first_name} error={!!state.errors?.first_name} required />
            </Field>
            <Field label="Last name" htmlFor="app-last" required error={state.errors?.last_name}>
              <TextInput id="app-last" name="last_name" autoComplete="family-name" defaultValue={state.values?.last_name} error={!!state.errors?.last_name} required />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Email address" htmlFor="app-email" required error={state.errors?.email}>
              <TextInput id="app-email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={!!state.errors?.email} required />
            </Field>
            <Field label="Phone / WhatsApp" htmlFor="app-phone" required error={state.errors?.phone}>
              <TextInput id="app-phone" name="phone" type="tel" autoComplete="tel" defaultValue={state.values?.phone} error={!!state.errors?.phone} required />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Country" htmlFor="app-country" error={state.errors?.country}>
              <TextInput id="app-country" name="country" defaultValue={state.values?.country || defaultCountry} />
            </Field>
            <Field label="Town / city" htmlFor="app-location" error={state.errors?.location}>
              <TextInput id="app-location" name="location" placeholder="e.g. Lusaka" defaultValue={state.values?.location} />
            </Field>
          </FormRow>
        </div>
      </fieldset>

      <fieldset className="card p-6">
        <legend className="px-1 text-sm font-semibold text-navy-900">Experience and skills</legend>
        <div className="mt-3 space-y-5">
          <FormRow>
            <Field label="Highest education" htmlFor="app-education" hint="School certificate, diploma, degree…">
              <TextInput id="app-education" name="education" defaultValue={state.values?.education} />
            </Field>
            <Field label="Years of experience" htmlFor="app-experience" hint="e.g. 2 years">
              <TextInput id="app-experience" name="experience" defaultValue={state.values?.experience} />
            </Field>
          </FormRow>
          <Field label="Key skills" htmlFor="app-skills" hint="Separate with commas">
            <TextInput id="app-skills" name="skills" defaultValue={state.values?.skills} />
          </Field>
          <Field label="Portfolio or website" htmlFor="app-portfolio" hint="Optional">
            <TextInput id="app-portfolio" name="portfolio_url" type="url" placeholder="https://" defaultValue={state.values?.portfolio_url} error={!!state.errors?.portfolio_url} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="card p-6">
        <legend className="px-1 text-sm font-semibold text-navy-900">Your application</legend>
        <div className="mt-3 space-y-5">
          <Field
            label="CV upload"
            htmlFor="app-cv"
            hint="PDF, Word or image — maximum 15 MB."
            error={state.errors?.cv}
          >
            <label
              htmlFor="app-cv"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-4 py-3 text-sm text-navy-600 transition hover:border-navy-300"
            >
              <Upload size={16} className="text-navy-400" aria-hidden />
              Choose your CV…
              <input id="app-cv" name="cv" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="sr-only" />
            </label>
          </Field>
          <Field label={`Cover letter — why you fit the ${jobTitle} role`} htmlFor="app-cover" required error={state.errors?.cover_letter}>
            <TextArea
              id="app-cover"
              name="cover_letter"
              rows={7}
              placeholder="Tell us about your experience, why this role interests you and what you would bring to the team."
              defaultValue={state.values?.cover_letter}
              error={!!state.errors?.cover_letter}
              required
            />
          </Field>
          <Field label="Anything else we should know?" htmlFor="app-extra" hint="Optional — availability, references, equipment.">
            <TextArea id="app-extra" name="additional_info" rows={4} defaultValue={state.values?.additional_info} />
          </Field>
        </div>
      </fieldset>

      <div className="card p-6">
        <CheckboxField
          id="app-consent"
          name="consent"
          required
          error={state.errors?.consent}
          label="I confirm that the information I have provided is accurate, and I consent to Seedwel Investment Limited processing my personal data for recruitment purposes as described in the Application Privacy Notice."
        />
      </div>

      <SubmitButton />
    </form>
  );
}
