'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { startConversationAction, sendMessageAction } from '@/app/actions/workplace';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, TextArea, TextInput } from '@/components/ui/FormField';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {pending ? 'Sending…' : label}
    </button>
  );
}

export function ConversationForm({ people }: { people: { id: number; name: string }[] }) {
  const [state, action] = useActionState(startConversationAction, emptyActionState);

  return (
    <form action={action} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <Field label="Subject" htmlFor="conversation-subject">
        <TextInput id="conversation-subject" name="subject" placeholder="What is this about?" />
      </Field>
      <Field label="With" htmlFor="conversation-people" required error={state.errors?.participants}>
        <select
          id="conversation-people"
          name="participants"
          multiple
          size={Math.min(8, Math.max(4, people.length))}
          className="field-input h-auto"
        >
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <p className="field-hint">Hold Ctrl (Cmd on Mac) to select several people.</p>
      </Field>
      <Field label="First message" htmlFor="conversation-body">
        <TextArea id="conversation-body" name="body" rows={4} placeholder="Write your message…" />
      </Field>
      <Submit label="Start conversation" />
    </form>
  );
}

export function MessageComposer({ conversationId }: { conversationId: number }) {
  const [state, action] = useActionState(sendMessageAction, emptyActionState);

  return (
    <form action={action} className="flex flex-col gap-3 border-t border-navy-100 p-4" noValidate>
      <input type="hidden" name="conversation_id" value={conversationId} />
      <FormMessage state={state} />
      <textarea
        name="body"
        rows={3}
        required
        placeholder="Write a message…"
        className="field-input"
      />
      <div className="flex justify-end">
        <Submit label="Send" />
      </div>
    </form>
  );
}
