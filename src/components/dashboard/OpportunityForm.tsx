'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2, ShieldAlert } from 'lucide-react';
import { saveOpportunityAction } from '@/app/actions/admin';
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

export interface OpportunityDefaults {
  id?: number;
  title?: string;
  category?: string;
  summary?: string;
  description?: string;
  location?: string;
  industry?: string;
  status?: string;
  requirements?: string;
  investment_range?: string;
  closing_date?: string | null;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  disclaimer?: string;
  is_regulated?: number;
  is_featured?: number;
}

export function OpportunityForm({
  categories,
  defaults,
}: {
  categories: readonly { readonly key: string; readonly label: string }[];
  defaults?: OpportunityDefaults;
}) {
  const [state, action] = useActionState(saveOpportunityAction, emptyActionState);

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="card p-5">
        <Field label="Title" htmlFor="opp-title" required error={state.errors?.title}>
          <TextInput id="opp-title" name="title" defaultValue={defaults?.title} error={!!state.errors?.title} required />
        </Field>
        <FormRow className="mt-4">
          <Field label="Category" htmlFor="opp-category" required>
            <Select id="opp-category" name="category" defaultValue={defaults?.category || 'business_opportunity'}>
              {categories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Industry" htmlFor="opp-industry">
            <TextInput id="opp-industry" name="industry" defaultValue={defaults?.industry} />
          </Field>
        </FormRow>
        <FormRow className="mt-4">
          <Field label="Location" htmlFor="opp-location">
            <TextInput id="opp-location" name="location" defaultValue={defaults?.location || 'Zambia'} />
          </Field>
          <Field label="Closing date" htmlFor="opp-closing">
            <TextInput id="opp-closing" name="closing_date" type="date" defaultValue={defaults?.closing_date?.slice(0, 10) || ''} />
          </Field>
        </FormRow>
      </div>

      <div className="card p-5">
        <Field label="Summary" htmlFor="opp-summary" required error={state.errors?.summary}>
          <TextArea id="opp-summary" name="summary" rows={2} defaultValue={defaults?.summary} error={!!state.errors?.summary} required />
        </Field>
        <div className="mt-4">
          <Field label="Full description" htmlFor="opp-description">
            <TextArea id="opp-description" name="description" rows={6} defaultValue={defaults?.description} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="What we are looking for" htmlFor="opp-requirements" hint="One per line.">
            <TextArea id="opp-requirements" name="requirements" rows={4} defaultValue={defaults?.requirements} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Indicative investment range" htmlFor="opp-range" hint="Optional">
            <TextInput id="opp-range" name="investment_range" defaultValue={defaults?.investment_range} placeholder="e.g. ZMW 10,000 – 50,000" />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-500">Contact for this opportunity</p>
        <FormRow>
          <Field label="Name" htmlFor="opp-contact-name">
            <TextInput id="opp-contact-name" name="contact_name" defaultValue={defaults?.contact_name} />
          </Field>
          <Field label="Email" htmlFor="opp-contact-email">
            <TextInput id="opp-contact-email" name="contact_email" type="email" defaultValue={defaults?.contact_email} />
          </Field>
        </FormRow>
        <div className="mt-4">
          <Field label="Phone" htmlFor="opp-contact-phone">
            <TextInput id="opp-contact-phone" name="contact_phone" defaultValue={defaults?.contact_phone} />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <FormRow>
          <Field label="Status" htmlFor="opp-status">
            <Select id="opp-status" name="status" defaultValue={defaults?.status || 'draft'}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <div className="flex items-end pb-2">
            <CheckboxField id="opp-featured" name="is_featured" defaultChecked={defaults?.is_featured === 1} label="Feature on the home page" />
          </div>
        </FormRow>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-amber-900">
            <ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
            Tick below only if this involves a regulated financial or securities product that has passed legal and
            licensing review. The public page will show a prominent warning.
          </p>
          <div className="mt-3">
            <CheckboxField
              id="opp-regulated"
              name="is_regulated"
              defaultChecked={defaults?.is_regulated === 1}
              label="This is (or involves) a regulated investment product"
            />
          </div>
        </div>

        <div className="mt-4">
          <Field label="Custom disclaimer" htmlFor="opp-disclaimer" hint="Optional — overrides the site-wide disclaimer for this item.">
            <TextArea id="opp-disclaimer" name="disclaimer" rows={2} defaultValue={defaults?.disclaimer} />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Submit label={defaults?.id ? 'Save opportunity' : 'Create opportunity'} />
        <Link href="/dashboard/opportunities" className="inline-flex items-center rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
