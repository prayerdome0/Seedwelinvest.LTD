import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'navy' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

const tones: Record<Tone, string> = {
  neutral: 'bg-navy-50 text-navy-700 border-navy-100',
  navy: 'bg-navy-900 text-white border-navy-900',
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-rose-50 text-rose-700 border-rose-100',
  info: 'bg-sky-50 text-sky-700 border-sky-100',
  gold: 'bg-gold-100 text-gold-600 border-gold-200',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  // Tasks
  pending: 'neutral',
  on_it: 'info',
  in_progress: 'info',
  submitted: 'warning',
  approved: 'success',
  changes_required: 'danger',
  resubmitted: 'warning',
  blocked: 'danger',
  cancelled: 'neutral',
  overdue: 'danger',
  // Applications
  new: 'info',
  under_review: 'warning',
  shortlisted: 'navy',
  interview: 'gold',
  invitation_sent: 'gold',
  registration: 'info',
  onboarding: 'info',
  accepted: 'success',
  rejected: 'danger',
  archived: 'neutral',
  // Service requests / projects
  planning: 'neutral',
  active: 'info',
  review: 'warning',
  completed: 'success',
  on_hold: 'warning',
  assigned: 'info',
  reviewing: 'warning',
  // Jobs
  published: 'success',
  draft: 'neutral',
  closed: 'danger',
  unpublished: 'neutral',
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <Badge tone={STATUS_TONES[status] ?? 'neutral'}>{label ?? status.replace(/_/g, ' ')}</Badge>;
}
