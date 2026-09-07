import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function TextInput({
  id,
  name,
  type = 'text',
  error,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; name: string; error?: boolean }) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      aria-invalid={error || undefined}
      className={cn('field-input', error && 'border-brand-400 focus:ring-brand-500/40', className)}
      {...rest}
    />
  );
}

export function TextArea({
  id,
  name,
  rows = 5,
  error,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; name: string; error?: boolean }) {
  return (
    <textarea
      id={id}
      name={name}
      rows={rows}
      aria-invalid={error || undefined}
      className={cn('field-input resize-y', error && 'border-brand-400', className)}
      {...rest}
    />
  );
}

export function Select({
  id,
  name,
  error,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; name: string; error?: boolean }) {
  return (
    <select
      id={id}
      name={name}
      aria-invalid={error || undefined}
      className={cn('field-input bg-white pr-8', error && 'border-brand-400', className)}
      {...rest}
    >
      {children}
    </select>
  );
}

export function CheckboxField({
  id,
  name,
  label,
  error,
  required,
  defaultChecked,
  className,
}: {
  id: string;
  name: string;
  label: ReactNode;
  error?: string;
  required?: boolean;
  defaultChecked?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-navy-300 text-navy-900 focus:ring-brand-500"
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-navy-700">
          {label}
          {required && <span className="ml-0.5 text-brand-600">*</span>}
        </label>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message?: string } | undefined }) {
  if (!state?.message) return null;
  return (
    <div
      role="status"
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        state.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-brand-200 bg-brand-50 text-brand-800',
      )}
    >
      {state.message}
    </div>
  );
}
