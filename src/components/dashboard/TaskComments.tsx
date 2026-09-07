'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { addTaskCommentAction } from '@/app/actions/workplace';
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
      {pending ? 'Posting…' : 'Post comment'}
    </button>
  );
}

export interface Comment {
  id: number;
  body: string;
  kind: string;
  created_at: string;
  author: string;
}

export function TaskComments({
  taskId,
  comments,
  canRequestChanges,
}: {
  taskId: number;
  comments: Comment[];
  canRequestChanges: boolean;
}) {
  const [state, action] = useActionState(addTaskCommentAction, emptyActionState);

  return (
    <Panel title="Conversation" subtitle={`${comments.length} message${comments.length === 1 ? '' : 's'}`}>
      <ul className="space-y-4">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className={`rounded-xl border p-3 ${
              comment.kind === 'change_request'
                ? 'border-brand-200 bg-brand-50/60'
                : comment.kind === 'approval'
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : comment.kind === 'system'
                    ? 'border-navy-100 bg-navy-50/60'
                    : 'border-navy-100 bg-white'
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-navy-900">{comment.author || 'System'}</p>
              <p className="text-2xs text-navy-400">
                {new Date(comment.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                })}
              </p>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-navy-700">{comment.body}</p>
            {comment.kind === 'change_request' && (
              <p className="mt-1 text-2xs font-semibold uppercase tracking-wider text-brand-600">Change requested</p>
            )}
            {comment.kind === 'approval' && (
              <p className="mt-1 text-2xs font-semibold uppercase tracking-wider text-emerald-600">Approval</p>
            )}
          </li>
        ))}
        {comments.length === 0 && <li className="py-3 text-sm text-navy-500">No messages yet.</li>}
      </ul>

      <form action={action} className="mt-5 space-y-3 border-t border-navy-100 pt-4">
        <input type="hidden" name="task_id" value={taskId} />
        <Field label="Add a comment" htmlFor={`comment-${taskId}`} error={state.errors?.body}>
          <TextArea id={`comment-${taskId}`} name="body" rows={3} placeholder="Ask a question, share an update or leave feedback." error={!!state.errors?.body} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Submit />
          {canRequestChanges && (
            <label className="inline-flex items-center gap-2 text-xs text-navy-600">
              <input type="checkbox" name="kind" value="change_request" className="h-4 w-4 rounded border-navy-300" />
              Flag as a change request
            </label>
          )}
        </div>
        <FormMessage state={state} />
      </form>
    </Panel>
  );
}
