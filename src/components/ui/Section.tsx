import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Section({
  children,
  className,
  id,
  tone = 'white',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: 'white' | 'mist' | 'navy' | 'gradient';
  padded?: boolean;
}) {
  const tones = {
    white: 'bg-white',
    mist: 'bg-mist',
    navy: 'bg-navy-900 text-navy-100',
    gradient: 'bg-gradient-to-b from-mist to-white',
  } as const;

  return (
    <section id={id} className={cn(tones[tone], padded && 'py-14 sm:py-18 lg:py-24', className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
  children,
  tone = 'light',
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  children?: ReactNode;
  tone?: 'light' | 'dark';
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && (
        <p className={cn('eyebrow eyebrow-line mb-3', tone === 'dark' && 'text-brand-300')}>{eyebrow}</p>
      )}
      <h2 className={cn('heading-2', tone === 'dark' && 'text-white')}>{title}</h2>
      {subtitle && (
        <p className={cn('mt-3 lead', tone === 'dark' && 'text-navy-200')}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-navy-400">{icon}</div>}
      <p className="text-base font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-navy-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
