'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { saveClientAction } from '@/app/actions/workplace';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, Select } from '@/components/ui/FormField';
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

export interface ClientDefaults {
  id?: number;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  industry?: string;
  country?: string;
  status?: string;
  notes?: string;
  owner_id?: number | null;
}

export function ClientForm({ owners, defaults }: { owners: { id: number; name: string }[]; defaults?: ClientDefaults }) {
  const [state, action] = useActionState(saveClientAction, emptyActionState);

  return (
    <form action={action} className="card space-y-5 p-5" noValidate>
      <FormMessage state={state} />
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <Field label="Company name" htmlFor="client-company" required error={state.errors?.company_name}>
        <TextInput id="client-company" name="company_name" defaultValue={defaults?.company_name} error={!!state.errors?.company_name} required />
      </Field>
      <FormRow>
        <Field label="Contact person" htmlFor="client-contact">
          <TextInput id="client-contact" name="contact_name" defaultValue={defaults?.contact_name} />
        </Field>
        <Field label="Email" htmlFor="client-email" error={state.errors?.email}>
          <TextInput id="client-email" name="email" type="email" defaultValue={defaults?.email} error={!!state.errors?.email} />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="Phone" htmlFor="client-phone">
          <TextInput id="client-phone" name="phone" defaultValue={defaults?.phone} />
        </Field>
        <Field label="Industry" htmlFor="client-industry">
          <TextInput id="client-industry" name="industry" defaultValue={defaults?.industry} />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="Country" htmlFor="client-country">
          <TextInput id="client-country" name="country" defaultValue={defaults?.country || 'Zambia'} />
        </Field>
        <Field label="Status" htmlFor="client-status">
          <Select id="client-status" name="status" defaultValue={defaults?.status || 'active'}>
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </FormRow>
      <Field label="Account owner" htmlFor="client-owner">
        <Select id="client-owner" name="owner_id" defaultValue={defaults?.owner_id ? String(defaults.owner_id) : ''}>
          <option value="">No owner</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes" htmlFor="client-notes">
        <TextArea id="client-notes" name="notes" rows={4} defaultValue={defaults?.notes} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Submit label={defaults?.id ? 'Save client' : 'Create client'} />
        <Link href="/dashboard/clients" className="inline-flex items-center rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
