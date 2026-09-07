'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { addProjectMessageAction } from '@/app/actions/workplace';
import { emptyActionState } from '@/lib/forms';
import { Panel } from '@/components/dashboard/ui';
import { Field, FormMessage, TextArea } from '@/components/ui/FormField';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {pending ? 'Posting…' : 'Post message'}
    </button>
  );
}

export interface ProjectMessage {
  id: number;
  body: string;
  is_internal: number;
  created_at: string;
  author: string;
}

export function ProjectConversation({
  projectId,
  messages,
  canPostInternal,
}: {
  projectId: number;
  messages: ProjectMessage[];
  canPostInternal: boolean;
}) {
  const [state, action] = useActionState(addProjectMessageAction, emptyActionState);

  return (
    <Panel title="Conversation" subtitle={`${messages.length} message${messages.length === 1 ? '' : 's'}`}>
      <ul className="space-y-3">
        {messages.map((message) => (
          <li
            key={message.id}
            className={`rounded-xl border p-3 ${message.is_internal ? 'border-amber-200 bg-amber-50/60' : 'border-navy-100 bg-white'}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-navy-900">{message.author}</p>
              <p className="text-2xs text-navy-400">
                {new Date(message.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                })}
              </p>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-navy-700">{message.body}</p>
            {message.is_internal === 1 && (
              <p className="mt-1 text-2xs font-semibold uppercase tracking-wider text-amber-700">Internal note</p>
            )}
          </li>
        ))}
        {messages.length === 0 && <li className="py-3 text-sm text-navy-500">No messages yet.</li>}
      </ul>

      <form action={action} className="mt-5 space-y-3 border-t border-navy-100 pt-4">
        <input type="hidden" name="project_id" value={projectId} />
        <Field label="Post an update" htmlFor={`project-message-${projectId}`} error={state.errors?.body}>
          <TextArea
            id={`project-message-${projectId}`}
            name="body"
            rows={3}
            placeholder="Share progress, ask a question or confirm a decision."
            error={!!state.errors?.body}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Submit />
          {canPostInternal && (
            <label className="inline-flex items-center gap-2 text-xs text-navy-600">
              <input type="checkbox" name="is_internal" value="1" className="h-4 w-4 rounded border-navy-300" />
              Internal only (hidden from clients)
            </label>
          )}
        </div>
        <FormMessage state={state} />
      </form>
    </Panel>
  );
}
