'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { saveTaskAction } from '@/app/actions/workplace';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, FormRow, TextArea, TextInput, Select } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? 'Saving…' : label}
    </Button>
  );
}

export interface Option {
  id: number;
  name: string;
}

export interface TaskDefaults {
  id?: number;
  title?: string;
  description?: string;
  instructions?: string;
  priority?: string;
  due_date?: string | null;
  start_date?: string | null;
  project_id?: number | null;
  department_id?: number | null;
  assignees?: number[];
  checklist?: string[];
}

export function TaskForm({
  people,
  projects,
  departments,
  defaults,
  canAssign,
}: {
  people: Option[];
  projects: Option[];
  departments: Option[];
  defaults?: TaskDefaults;
  canAssign: boolean;
}) {
  const [state, action] = useActionState(saveTaskAction, emptyActionState);

  return (
    <form action={action} className="space-y-5" noValidate encType="multipart/form-data">
      <FormMessage state={state} />
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="card p-5">
        <Field label="Task title" htmlFor="task-title" required error={state.errors?.title}>
          <TextInput id="task-title" name="title" defaultValue={defaults?.title} error={!!state.errors?.title} required placeholder="What needs to be done?" />
        </Field>
        <div className="mt-4">
          <Field label="Description" htmlFor="task-description" error={state.errors?.description}>
            <TextArea id="task-description" name="description" rows={4} defaultValue={defaults?.description} placeholder="Context, background and links." />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Instructions" htmlFor="task-instructions" hint="Step-by-step notes for the person doing the work.">
            <TextArea id="task-instructions" name="instructions" rows={4} defaultValue={defaults?.instructions} />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <FormRow>
          <Field label="Priority" htmlFor="task-priority" error={state.errors?.priority}>
            <Select id="task-priority" name="priority" defaultValue={defaults?.priority || 'medium'}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </Field>
          <Field label="Due date" htmlFor="task-due" error={state.errors?.due_date}>
            <TextInput id="task-due" name="due_date" type="date" defaultValue={defaults?.due_date?.slice(0, 10) || ''} />
          </Field>
        </FormRow>
        <FormRow className="mt-4">
          <Field label="Start date" htmlFor="task-start">
            <TextInput id="task-start" name="start_date" type="date" defaultValue={defaults?.start_date?.slice(0, 10) || ''} />
          </Field>
          <Field label="Department" htmlFor="task-department">
            <Select id="task-department" name="department_id" defaultValue={defaults?.department_id ? String(defaults.department_id) : ''}>
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </FormRow>
        <div className="mt-4">
          <Field label="Link to project" htmlFor="task-project">
            <Select id="task-project" name="project_id" defaultValue={defaults?.project_id ? String(defaults.project_id) : ''}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      {canAssign && (
        <div className="card p-5">
          <Field
            label="Assign to"
            htmlFor="task-assignees"
            hint="Hold Ctrl (Cmd on Mac) to select several people."
            error={state.errors?.assignees}
          >
            <select
              id="task-assignees"
              name="assignees"
              multiple
              size={Math.min(8, Math.max(4, people.length))}
              defaultValue={(defaults?.assignees ?? []).map(String)}
              className="field-input h-auto"
            >
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="field-hint">
            The selected people are notified immediately and the task appears in their My Day.
          </p>
        </div>
      )}

      <div className="card p-5">
        <Field label="Checklist" htmlFor="task-checklist" hint="One item per line." error={state.errors?.checklist}>
          <TextArea
            id="task-checklist"
            name="checklist"
            rows={4}
            defaultValue={(defaults?.checklist ?? []).join('\n')}
            placeholder={'Review the brief\nDraft the first version\nSend for review'}
          />
        </Field>
        <div className="mt-4">
          <Field label="Attachments" htmlFor="task-files" hint="Optional. Documents, briefs or references (max 15 MB each).">
            <input id="task-files" name="attachments" type="file" multiple className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800" />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Submit label={defaults?.id ? 'Save changes' : 'Create task'} />
        <Link
          href={defaults?.id ? `/dashboard/tasks/${defaults.id}` : '/dashboard/tasks'}
          className="inline-flex items-center rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
