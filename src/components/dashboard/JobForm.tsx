'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { saveJobAction } from '@/app/actions/recruitment';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, Select, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {pending ? 'Saving…' : label}
    </Button>
  );
}

export interface JobDefaults {
  id?: number;
  title?: string;
  department?: string;
  employment_type?: string;
  location?: string;
  remote_status?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  salary_visible?: number;
  positions?: number;
  summary?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  skills?: string;
  deadline?: string | null;
  status?: string;
  is_featured?: number;
}

export function JobForm({ defaults, mode }: { defaults?: JobDefaults; mode: 'create' | 'edit' }) {
  const [state, action] = useActionState(saveJobAction, emptyActionState);
  const d = defaults;

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}

      <div className="card p-5">
        <FormRow>
          <Field label="Job title" htmlFor="job-title" required error={state.errors?.title}>
            <TextInput id="job-title" name="title" defaultValue={d?.title} error={!!state.errors?.title} required placeholder="e.g. Cold Caller" />
          </Field>
          <Field label="Department" htmlFor="job-department">
            <TextInput id="job-department" name="department" defaultValue={d?.department} placeholder="e.g. Sales" />
          </Field>
        </FormRow>
        <FormRow className="mt-4">
          <Field label="Employment type" htmlFor="job-type" required>
            <Select id="job-type" name="employment_type" defaultValue={d?.employment_type || 'Full-time'}>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </Select>
          </Field>
          <Field label="Work arrangement" htmlFor="job-remote">
            <Select id="job-remote" name="remote_status" defaultValue={d?.remote_status || 'On-site'}>
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </Select>
          </Field>
        </FormRow>
        <div className="mt-4">
          <Field label="Location" htmlFor="job-location" required error={state.errors?.location}>
            <TextInput id="job-location" name="location" defaultValue={d?.location || 'Lusaka, Zambia'} error={!!state.errors?.location} required />
          </Field>
        </div>
        <FormRow className="mt-4">
          <Field label="Positions available" htmlFor="job-positions">
            <TextInput id="job-positions" name="positions" type="number" min={1} defaultValue={d?.positions ?? 1} />
          </Field>
          <Field label="Closing date" htmlFor="job-deadline" hint="Optional — leave blank to keep it open until filled.">
            <TextInput id="job-deadline" name="deadline" type="date" defaultValue={d?.deadline?.slice(0, 10) || ''} />
          </Field>
        </FormRow>
      </div>

      <div className="card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-500">Compensation</p>
        <FormRow>
          <Field label="Minimum (per month)" htmlFor="job-min">
            <TextInput id="job-min" name="salary_min" type="number" min={0} defaultValue={d?.salary_min ?? ''} />
          </Field>
          <Field label="Maximum (per month)" htmlFor="job-max">
            <TextInput id="job-max" name="salary_max" type="number" min={0} defaultValue={d?.salary_max ?? ''} />
          </Field>
        </FormRow>
        <FormRow className="mt-4">
          <Field label="Currency" htmlFor="job-currency">
            <Select id="job-currency" name="salary_currency" defaultValue={d?.salary_currency || 'ZMW'}>
              <option value="ZMW">ZMW</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <div className="flex items-end pb-2">
            <CheckboxField id="job-salary-visible" name="salary_visible" defaultChecked={d?.salary_visible === 1} label="Show this salary range on the public careers page" />
          </div>
        </FormRow>
      </div>

      <div className="card p-5">
        <Field label="Short summary" htmlFor="job-summary" required error={state.errors?.summary} hint="One or two sentences shown on the vacancy card.">
          <TextArea id="job-summary" name="summary" rows={2} defaultValue={d?.summary} error={!!state.errors?.summary} required />
        </Field>
        <div className="mt-4">
          <Field label="Full description" htmlFor="job-description" required error={state.errors?.description}>
            <TextArea id="job-description" name="description" rows={6} defaultValue={d?.description} error={!!state.errors?.description} required />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Responsibilities" htmlFor="job-responsibilities" hint="One per line.">
            <TextArea id="job-responsibilities" name="responsibilities" rows={5} defaultValue={d?.responsibilities} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Requirements" htmlFor="job-requirements" hint="One per line.">
            <TextArea id="job-requirements" name="requirements" rows={5} defaultValue={d?.requirements} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Skills" htmlFor="job-skills" hint="Comma separated.">
            <TextInput id="job-skills" name="skills" defaultValue={d?.skills} placeholder="Communication, CRM, Lead generation" />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <FormRow>
          <Field label="Status" htmlFor="job-status" error={state.errors?.status}>
            <Select id="job-status" name="status" defaultValue={d?.status || 'draft'}>
              <option value="draft">Draft — not visible</option>
              <option value="published">Published — visible and accepting applications</option>
              <option value="closed">Closed — visible but not accepting applications</option>
              <option value="archived">Archived — hidden</option>
            </Select>
          </Field>
          <div className="flex items-end pb-2">
            <CheckboxField id="job-featured" name="is_featured" defaultChecked={d?.is_featured === 1} label="Feature this vacancy on the home page" />
          </div>
        </FormRow>
      </div>

      <div className="flex flex-wrap gap-3">
        <Submit label={mode === 'edit' ? 'Save vacancy' : 'Create vacancy'} />
        <Link href="/dashboard/recruitment/jobs" className="inline-flex items-center rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
