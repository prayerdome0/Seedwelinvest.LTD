'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertTriangle, CheckCircle2, Loader2, MessageSquareWarning, PlayCircle, RotateCcw } from 'lucide-react';
import { setTaskStatusAction, submitWorkAction, reviewSubmissionAction } from '@/app/actions/workplace';
import { emptyActionState } from '@/lib/forms';
import { Panel } from '@/components/dashboard/ui';
import { Field, FormMessage, TextArea } from '@/components/ui/FormField';

function Pending({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <span className="inline-flex items-center gap-2">
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {pending ? 'Working…' : label}
    </span>
  );
}

interface Submission {
  id: number;
  notes: string;
  status: string;
  review_notes: string;
  created_at: string;
  author: string;
}

export function TaskWorkflow({
  taskId,
  status,
  isAssignee,
  canReview,
  submissions,
}: {
  taskId: number;
  status: string;
  isAssignee: boolean;
  canReview: boolean;
  submissions: Submission[];
}) {
  const [startState, startAction] = useActionState(setTaskStatusAction, emptyActionState);
  const [submitState, submitAction] = useActionState(submitWorkAction, emptyActionState);
  const [blockState, blockAction] = useActionState(setTaskStatusAction, emptyActionState);
  const [blockedNote, setBlockedNote] = useState(false);

  const latestSubmission = submissions[0];
  const canSubmit = isAssignee && ['in_progress', 'on_it', 'changes_required', 'pending'].includes(status);
  const canStart = isAssignee && ['pending', 'on_it'].includes(status);
  const needsReview = canReview && ['submitted', 'resubmitted'].includes(status) && latestSubmission?.status === 'pending';

  return (
    <Panel title="Workflow" subtitle="Start, submit and review work">
      <div className="space-y-4">
        {startState.message && <FormMessage state={startState} />}
        {submitState.message && <FormMessage state={submitState} />}

        {canStart && (
          <form action={startAction}>
            <input type="hidden" name="id" value={taskId} />
            <input type="hidden" name="status" value="in_progress" />
            <input type="hidden" name="note" value="Picked up this task." />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-800 sm:w-auto"
            >
              <Pending label="I’m On It" />
            </button>
          </form>
        )}

        {status === 'approved' && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden />
            <p>This work has been approved and the task is complete.</p>
          </div>
        )}

        {status === 'changes_required' && latestSubmission?.review_notes && (
          <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
            <MessageSquareWarning size={17} className="mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Changes requested</p>
              <p className="mt-1">{latestSubmission.review_notes}</p>
            </div>
          </div>
        )}

        {status === 'blocked' && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
            <p>This task is blocked. Add a comment explaining what is needed, or resume when you can continue.</p>
          </div>
        )}

        {canSubmit && (
          <div className="rounded-xl border border-navy-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-navy-900">Submit your work</h3>
            <form action={submitAction} className="mt-3 space-y-3">
              <input type="hidden" name="task_id" value={taskId} />
              <Field label="What have you done?" htmlFor={`submit-notes-${taskId}`} required error={submitState.errors?.notes}>
                <TextArea
                  id={`submit-notes-${taskId}`}
                  name="notes"
                  rows={3}
                  placeholder="Describe the work and where the files are."
                  error={!!submitState.errors?.notes}
                  required
                />
              </Field>
              <Field label="Attach a file" htmlFor={`submit-file-${taskId}`} hint="Optional — documents, designs, screenshots (max 15 MB).">
                <input
                  id={`submit-file-${taskId}`}
                  name="file"
                  type="file"
                  className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800"
                />
              </Field>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Pending label="Submit Work" />
              </button>
            </form>
          </div>
        )}

        {needsReview && latestSubmission && (
          <ReviewSubmission submissionId={latestSubmission.id} author={latestSubmission.author} createdAt={latestSubmission.created_at} notes={latestSubmission.notes} />
        )}

        {submissions.length > 0 && (
          <div className="rounded-xl border border-navy-100">
            <p className="border-b border-navy-100 bg-navy-50/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-navy-500">
              Submission history
            </p>
            <ul className="divide-y divide-navy-100">
              {submissions.map((submission) => (
                <li key={submission.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-navy-900">{submission.author}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-2xs font-semibold uppercase ${
                        submission.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : submission.status === 'changes_required'
                            ? 'bg-brand-50 text-brand-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {submission.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-navy-600">{submission.notes}</p>
                  {submission.review_notes && (
                    <p className="mt-1 text-xs italic text-navy-500">Review: {submission.review_notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isAssignee && !['approved', 'cancelled', 'blocked'].includes(status) && !blockedNote && (
          <button
            type="button"
            onClick={() => setBlockedNote(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-700 hover:bg-navy-50"
          >
            <AlertTriangle size={15} aria-hidden /> Mark as blocked
          </button>
        )}

        {blockedNote && (
          <form action={blockAction} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <input type="hidden" name="id" value={taskId} />
            <input type="hidden" name="status" value="blocked" />
            <Field label="What is blocking this task?" htmlFor="blocked-note" required>
              <TextArea id="blocked-note" name="note" rows={2} placeholder="Waiting for client feedback…" required />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="inline-flex items-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white">
                <Pending label="Mark as blocked" />
              </button>
              <button
                type="button"
                onClick={() => setBlockedNote(false)}
                className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-700"
              >
                Cancel
              </button>
            </div>
            {blockState.message && <FormMessage state={blockState} />}
          </form>
        )}

        {isAssignee && status === 'blocked' && (
          <form action={startAction}>
            <input type="hidden" name="id" value={taskId} />
            <input type="hidden" name="status" value="in_progress" />
            <input type="hidden" name="note" value="Resumed work on this task." />
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-700 hover:bg-navy-50">
              <RotateCcw size={15} aria-hidden /> <Pending label="Resume work" />
            </button>
          </form>
        )}

        {!isAssignee && !canReview && (
          <p className="flex items-center gap-2 text-sm text-navy-500">
            <PlayCircle size={15} aria-hidden /> Only assigned staff can move this task forward.
          </p>
        )}
      </div>
    </Panel>
  );
}

function ReviewSubmission({
  submissionId,
  author,
  createdAt,
  notes,
}: {
  submissionId: number;
  author: string;
  createdAt: string;
  notes: string;
}) {
  const [state, action] = useActionState(reviewSubmissionAction, emptyActionState);

  return (
    <div className="rounded-xl border border-navy-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-navy-900">Review submission</h3>
      <p className="mt-1 text-xs text-navy-500">
        {author} · {new Date(createdAt.replace(' ', 'T') + 'Z').toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
      </p>
      <p className="mt-2 text-sm leading-relaxed text-navy-700">{notes}</p>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="submission_id" value={submissionId} />
        <Field label="Feedback" htmlFor={`review-notes-${submissionId}`} hint="Required when requesting changes.">
          <TextArea id={`review-notes-${submissionId}`} name="notes" rows={3} placeholder="What works well, and what needs to change?" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="decision"
            value="approve"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Pending label="Approve work" />
          </button>
          <button
            type="submit"
            name="decision"
            value="request_changes"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-300 bg-white px-5 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            <Pending label="Request changes" />
          </button>
        </div>
        {state.message && <FormMessage state={state} />}
      </form>
    </div>
  );
}
