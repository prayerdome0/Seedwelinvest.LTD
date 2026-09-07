import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-navy-500" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden>/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-navy-900">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-navy-700">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-navy-900 sm:text-2xl">{title}</h1>
        {subtitle && <div className="mt-1.5 max-w-2xl text-sm text-navy-600">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-navy-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-navy-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(padded && 'p-5')}>{children}</div>
    </section>
  );
}

const statTones = {
  navy: 'bg-navy-900 text-white',
  brand: 'bg-brand-600 text-white',
  gold: 'bg-gold-400 text-navy-900',
  soft: 'bg-navy-50 text-navy-900',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
} as const;

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = 'soft',
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  tone?: keyof typeof statTones;
  icon?: ReactNode;
}) {
  const body = (
    <div className={cn('flex h-full items-start justify-between gap-3 rounded-2xl p-5', statTones[tone])}>
      <div className="min-w-0">
        <p className={cn('truncate text-xs font-medium', tone === 'navy' || tone === 'brand' ? 'text-white/70' : 'text-navy-500')}>
          {label}
        </p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && (
          <p className={cn('mt-1 truncate text-xs', tone === 'navy' || tone === 'brand' ? 'text-white/60' : 'text-navy-500')}>
            {hint}
          </p>
        )}
      </div>
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full transition-transform hover:-translate-y-0.5">
      {body}
    </Link>
  ) : (
    body
  );
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <form method="get" className={cn('card mb-5 flex flex-wrap items-end gap-3 p-4', className)}>
      {children}
    </form>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="min-w-[150px] flex-1">
      <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">{label}</span>
      {children}
    </label>
  );
}

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('table-wrap rounded-2xl border border-navy-100 bg-white', className)}>{children}</div>;
}

export function Pagination({ page, perPage, total, basePath, params }: { page: number; perPage: number; total: number; basePath: string; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const build = (p: number) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) search.set(k, v);
    search.set('page', String(p));
    return `${basePath}?${search.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-navy-600">
      <p>
        Page {page} of {pages} · {total} record{total === 1 ? '' : 's'}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={build(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-1.5 hover:bg-navy-50">
            <ChevronLeft size={14} aria-hidden /> Previous
          </Link>
        )}
        {page < pages && (
          <Link href={build(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-1.5 hover:bg-navy-50">
            Next <ChevronRight size={14} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

export function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 transition-colors hover:text-brand-600"
    >
      {label}
      <ArrowRight size={14} aria-hidden />
    </Link>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-navy-500">
        {children}
      </td>
    </tr>
  );
}
