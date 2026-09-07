'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { saveProjectAction } from '@/app/actions/workplace';
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

export interface ProjectDefaults {
  id?: number;
  name?: string;
  client_id?: number | null;
  client_label?: string;
  summary?: string;
  description?: string;
  status?: string;
  progress?: number;
  start_date?: string | null;
  deadline?: string | null;
  services?: string;
  technologies?: string;
  results?: string;
  link?: string;
  is_published?: number;
  is_featured?: number;
  members?: number[];
}

export function ProjectForm({
  clients,
  people,
  defaults,
}: {
  clients: { id: number; company_name: string }[];
  people: { id: number; name: string }[];
  defaults?: ProjectDefaults;
}) {
  const [state, action] = useActionState(saveProjectAction, emptyActionState);

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="card p-5">
        <Field label="Project name" htmlFor="project-name" required error={state.errors?.name}>
          <TextInput id="project-name" name="name" defaultValue={defaults?.name} error={!!state.errors?.name} required />
        </Field>
        <FormRow className="mt-4">
          <Field label="Client record" htmlFor="project-client">
            <Select id="project-client" name="client_id" defaultValue={defaults?.client_id ? String(defaults.client_id) : ''}>
              <option value="">No linked client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Client label" htmlFor="project-label" hint="Shown on the public portfolio if published.">
            <TextInput id="project-label" name="client_label" defaultValue={defaults?.client_label} placeholder="e.g. A Lusaka retailer" />
          </Field>
        </FormRow>
        <div className="mt-4">
          <Field label="Summary" htmlFor="project-summary">
            <TextArea id="project-summary" name="summary" rows={2} defaultValue={defaults?.summary} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Description" htmlFor="project-description">
            <TextArea id="project-description" name="description" rows={5} defaultValue={defaults?.description} />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <FormRow>
          <Field label="Status" htmlFor="project-status">
            <Select id="project-status" name="status" defaultValue={defaults?.status || 'planning'}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Progress (%)" htmlFor="project-progress">
            <TextInput id="project-progress" name="progress" type="number" min={0} max={100} defaultValue={defaults?.progress ?? 0} />
          </Field>
        </FormRow>
        <FormRow className="mt-4">
          <Field label="Start date" htmlFor="project-start">
            <TextInput id="project-start" name="start_date" type="date" defaultValue={defaults?.start_date?.slice(0, 10) || ''} />
          </Field>
          <Field label="Target date" htmlFor="project-deadline">
            <TextInput id="project-deadline" name="deadline" type="date" defaultValue={defaults?.deadline?.slice(0, 10) || ''} />
          </Field>
        </FormRow>
      </div>

      <div className="card p-5">
        <Field label="Services delivered" htmlFor="project-services" hint="One per line.">
          <TextArea id="project-services" name="services" rows={3} defaultValue={defaults?.services} />
        </Field>
        <div className="mt-4">
          <Field label="Technologies" htmlFor="project-tech">
            <TextInput id="project-tech" name="technologies" defaultValue={defaults?.technologies} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Results / outcomes" htmlFor="project-results" hint="One per line.">
            <TextArea id="project-results" name="results" rows={3} defaultValue={defaults?.results} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Live link" htmlFor="project-link">
            <TextInput id="project-link" name="link" type="url" placeholder="https://" defaultValue={defaults?.link} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <CheckboxField id="project-published" name="is_published" defaultChecked={defaults?.is_published === 1} label="Publish on the public portfolio" />
          <CheckboxField id="project-featured" name="is_featured" defaultChecked={defaults?.is_featured === 1} label="Feature on the home page" />
        </div>
      </div>

      <div className="card p-5">
        <Field label="Team members" htmlFor="project-members" hint="Hold Ctrl (Cmd on Mac) to select several people.">
          <select
            id="project-members"
            name="members"
            multiple
            size={Math.min(8, Math.max(4, people.length))}
            defaultValue={(defaults?.members ?? []).map(String)}
            className="field-input h-auto"
          >
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <Submit label={defaults?.id ? 'Save project' : 'Create project'} />
        <Link href="/dashboard/projects" className="inline-flex items-center rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
