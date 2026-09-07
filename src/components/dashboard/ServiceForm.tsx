'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { saveServiceAction } from '@/app/actions/admin';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, Select, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {pending ? 'Saving…' : label}
    </Button>
  );
}

export interface ServiceDefaults {
  id?: number;
  name?: string;
  division?: string;
  icon?: string;
  summary?: string;
  description?: string;
  benefits?: string;
  process?: string;
  deliverables?: string;
  starting_price?: string;
  is_published?: number;
  is_featured?: number;
  sort_order?: number;
  image_path?: string | null;
}

export function ServiceForm({ icons, defaults }: { icons: string[]; defaults?: ServiceDefaults }) {
  const [state, action] = useActionState(saveServiceAction, emptyActionState);

  return (
    <form action={action} className="space-y-5" noValidate encType="multipart/form-data">
      <FormMessage state={state} />
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="card p-5">
        <FormRow>
          <Field label="Service name" htmlFor="service-name" required error={state.errors?.name}>
            <TextInput id="service-name" name="name" defaultValue={defaults?.name} error={!!state.errors?.name} required />
          </Field>
          <Field label="Division" htmlFor="service-division">
            <Select id="service-division" name="division" defaultValue={defaults?.division || 'digital'}>
              <option value="digital">Digital Solutions</option>
              <option value="branding">Branding & Creative</option>
              <option value="business">Business Support & Development</option>
              <option value="talent">Talent & Recruitment</option>
              <option value="education">Education & Skills</option>
              <option value="opportunities">Business Opportunities</option>
            </Select>
          </Field>
        </FormRow>
        <div className="mt-4">
          <Field label="Summary" htmlFor="service-summary" required error={state.errors?.summary} hint="Shown on cards across the site.">
            <TextArea id="service-summary" name="summary" rows={2} defaultValue={defaults?.summary} error={!!state.errors?.summary} required />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Full description" htmlFor="service-description">
            <TextArea id="service-description" name="description" rows={6} defaultValue={defaults?.description} />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <Field label="Benefits" htmlFor="service-benefits" hint="One per line.">
          <TextArea id="service-benefits" name="benefits" rows={4} defaultValue={defaults?.benefits} />
        </Field>
        <div className="mt-4">
          <Field label="How we deliver it" htmlFor="service-process" hint="One per line.">
            <TextArea id="service-process" name="process" rows={4} defaultValue={defaults?.process} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Deliverables" htmlFor="service-deliverables" hint="One per line.">
            <TextArea id="service-deliverables" name="deliverables" rows={4} defaultValue={defaults?.deliverables} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Indicative price" htmlFor="service-price" hint="e.g. “From ZMW 2,500”">
            <TextInput id="service-price" name="starting_price" defaultValue={defaults?.starting_price} />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <FormRow>
          <Field label="Icon" htmlFor="service-icon">
            <Select id="service-icon" name="icon" defaultValue={defaults?.icon || 'Sparkles'}>
              {icons.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort order" htmlFor="service-order">
            <TextInput id="service-order" name="sort_order" type="number" defaultValue={defaults?.sort_order ?? 0} />
          </Field>
        </FormRow>
        <div className="mt-4">
          <Field label="Image" htmlFor="service-image" hint="Optimised automatically. Leave empty to keep the current one.">
            {defaults?.image_path && (
              <span className="mb-2 flex items-center gap-3">
                <Image src={defaults.image_path} alt="" width={72} height={48} className="h-12 w-18 rounded object-cover" />
                <span className="text-xs text-navy-500">{defaults.image_path}</span>
              </span>
            )}
            <input type="hidden" name="existing_image" value={defaults?.image_path || ''} />
            <input
              id="service-image"
              name="image"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800"
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <CheckboxField id="service-published" name="is_published" defaultChecked={(defaults?.is_published ?? 1) === 1} label="Published on the website" />
          <CheckboxField id="service-featured" name="is_featured" defaultChecked={defaults?.is_featured === 1} label="Feature on the home page" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Submit label={defaults?.id ? 'Save service' : 'Create service'} />
        <Link href="/dashboard/services" className="inline-flex items-center rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50">
          Cancel
        </Link>
      </div>

      <p className="flex items-center gap-2 text-2xs text-navy-500">
        <Icon name={defaults?.icon || 'Sparkles'} size={14} /> Preview of the selected icon
      </p>
    </form>
  );
}
