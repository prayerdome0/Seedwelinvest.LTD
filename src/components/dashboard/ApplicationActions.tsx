'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { updateApplicationStatusAction, addApplicationNoteAction, scheduleInterviewAction } from '@/app/actions/recruitment';
import { emptyActionState } from '@/lib/forms';
import { Panel } from '@/components/dashboard/ui';
import { Field, FormMessage, TextArea, Select, TextInput } from '@/components/ui/FormField';

function Button({ label, tone = 'dark' }: { label: string; tone?: 'dark' | 'ghost' }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        tone === 'ghost'
          ? 'inline-flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-700 hover:bg-navy-50 disabled:opacity-60'
          : 'inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60'
      }
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {pending ? 'Saving…' : label}
    </button>
  );
}

export function ApplicationActions({
  applicationId,
  currentStatus,
  statuses,
  notes,
  rating,
  reviewer,
}: {
  applicationId: number;
  currentStatus: string;
  statuses: { value: string; label: string }[];
  notes: string;
  rating: number;
  reviewer: string | null;
}) {
  const [statusState, statusAction] = useActionState(updateApplicationStatusAction, emptyActionState);
  const [noteState, noteAction] = useActionState(addApplicationNoteAction, emptyActionState);
  const [interviewState, interviewAction] = useActionState(scheduleInterviewAction, emptyActionState);
  const [showInterview, setShowInterview] = useState(false);

  return (
    <div className="space-y-5">
      <Panel title="Move to next stage">
        <form action={statusAction} className="space-y-3">
          <input type="hidden" name="id" value={applicationId} />
          <Field label="Stage" htmlFor="application-status" required>
            <Select id="application-status" name="status" defaultValue={currentStatus}>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note" htmlFor="application-note" hint="Optional — recorded in the application history.">
            <TextArea id="application-note" name="note" rows={2} placeholder="Reason for this change…" />
          </Field>
          <Button label="Update stage" />
          {statusState.message && <FormMessage state={statusState} />}
        </form>
        <p className="mt-3 text-2xs text-navy-500">
          {reviewer ? `Last reviewed by ${reviewer}.` : 'Not reviewed yet.'} Stage changes are written to the audit log.
        </p>
      </Panel>

      <Panel title="Internal notes">
        <form action={noteAction} className="space-y-3">
          <input type="hidden" name="id" value={applicationId} />
          <Field label="Notes" htmlFor="application-notes">
            <TextArea id="application-notes" name="note" rows={4} defaultValue={notes} placeholder="Impressions, follow-ups, references…" />
          </Field>
          <Field label="Rating (1–5)" htmlFor="application-rating">
            <Select id="application-rating" name="rating" defaultValue={rating ? String(rating) : '0'}>
              <option value="0">Not rated</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Button label="Save notes" />
          {noteState.message && <FormMessage state={noteState} />}
        </form>
      </Panel>

      <Panel title="Interviews">
        {!showInterview ? (
          <button
            type="button"
            onClick={() => setShowInterview(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-700 hover:bg-navy-50"
          >
            <CalendarPlus size={15} aria-hidden /> Schedule an interview
          </button>
        ) : (
          <form action={interviewAction} className="space-y-3">
            <input type="hidden" name="id" value={applicationId} />
            <Field label="Date and time" htmlFor="interview-at" required error={interviewState.errors?.scheduled_at}>
              <TextInput id="interview-at" name="scheduled_at" type="datetime-local" error={!!interviewState.errors?.scheduled_at} required />
            </Field>
            <Field label="Format" htmlFor="interview-mode">
              <Select id="interview-mode" name="mode" defaultValue="Online">
                <option value="Online">Online</option>
                <option value="In person">In person</option>
                <option value="Phone">Phone</option>
              </Select>
            </Field>
            <Field label="Location or link" htmlFor="interview-location">
              <TextInput id="interview-location" name="location" placeholder="Meeting link or office" />
            </Field>
            <Field label="Notes" htmlFor="interview-notes">
              <TextArea id="interview-notes" name="notes" rows={2} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button label="Schedule" />
              <button
                type="button"
                onClick={() => setShowInterview(false)}
                className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-700 hover:bg-navy-50"
              >
                Cancel
              </button>
            </div>
            {interviewState.message && <FormMessage state={interviewState} />}
          </form>
        )}
      </Panel>
    </div>
  );
}
