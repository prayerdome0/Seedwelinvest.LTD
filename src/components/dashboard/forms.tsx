'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import type { ActionState } from '@/lib/forms';
import { cn } from '@/lib/utils';

export type ServerAction = (state: ActionState, form: FormData) => Promise<ActionState>;

const variants = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800',
  accent: 'bg-brand-600 text-white hover:bg-brand-700',
  outline: 'border border-navy-200 bg-white text-navy-900 hover:bg-navy-50',
  ghost: 'text-navy-700 hover:bg-navy-50',
  danger: 'bg-brand-600 text-white hover:bg-brand-700',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
} as const;

function Button({ pendingLabel, children, variant = 'primary', size = 'md', className }: {
  pendingLabel?: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? 'Working…') : children}
    </button>
  );
}

/**
 * Wraps a server action with useActionState so every dashboard form gets a
 * pending state, an inline result message and a confirmation step when needed.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant = 'primary',
  size = 'md',
  className,
  formClassName,
  confirm,
  confirmLabel = 'Confirm',
  hideSubmit = false,
  resetOnSuccess = false,
}: {
  action: ServerAction;
  children?: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  formClassName?: string;
  confirm?: string;
  confirmLabel?: string;
  hideSubmit?: boolean;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, { ok: false } as ActionState);
  const [armed, setArmed] = useState(!confirm);

  if (state.ok && resetOnSuccess === false && state.message && !confirm) {
    // keep the message visible but allow further submissions
  }

  return (
    <div className={className}>
      <form action={formAction} className={formClassName} noValidate>
        {children}
        {!hideSubmit && armed && (
          <Button pendingLabel={pendingLabel} variant={variant} size={size}>
            {submitLabel}
          </Button>
        )}
        {!armed && (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors',
              variants[variant],
              sizes[size],
            )}
          >
            {confirmLabel}
          </button>
        )}
      </form>
      {state.message && (
        <p
          className={cn(
            'mt-2 text-xs',
            state.ok ? 'text-emerald-700' : 'text-brand-700',
          )}
          role="status"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}

/** Small inline form used for row actions (publish, close, delete…). */
export function InlineActionForm({
  action,
  fields,
  label,
  confirm,
  variant = 'outline',
  size = 'sm',
  className,
}: {
  action: ServerAction;
  fields: Record<string, string | number>;
  label: string;
  confirm?: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={label}
      variant={variant}
      size={size}
      confirm={confirm}
      className={className}
      formClassName="inline-flex"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </ActionForm>
  );
}

export function ConfirmForm({
  action,
  fields,
  label,
  confirm,
  variant = 'danger',
  size = 'sm',
}: {
  action: ServerAction;
  fields: Record<string, string | number>;
  label: string;
  confirm: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return <InlineActionForm action={action} fields={fields} label={label} confirm={confirm} variant={variant} size={size} />;
}
