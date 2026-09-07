import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Briefcase, CalendarDays, MapPin, Star, Users } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { cn, formatDate, money, truncate } from '@/lib/utils';
import { DIVISION_LABELS, type JobRow, type OpportunityRow, type ProjectRow, type ServiceRow } from '@/lib/data/site';
import { OPPORTUNITY_CATEGORIES } from '@/lib/rbac';

/* ------------------------------------------------------------------ services */

export function ServiceCard({ service, showIcon = true }: { service: ServiceRow; showIcon?: boolean }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="card card-hover group flex h-full flex-col p-6"
    >
      {showIcon && (
        <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-900 transition-colors group-hover:bg-navy-900 group-hover:text-white">
          <Icon name={service.icon} size={20} />
        </span>
      )}
      <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-brand-600">
        {DIVISION_LABELS[service.division] ?? service.division}
      </p>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-navy-900">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-600">{truncate(service.summary, 150)}</p>
      {service.starting_price && (
        <p className="mt-4 text-xs font-medium text-navy-500">From {service.starting_price}</p>
      )}
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900">
        View service
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------------- jobs */

export function JobCard({ job }: { job: JobRow }) {
  return (
    <Link href={`/careers/${job.slug}`} className="card card-hover group flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold leading-snug text-navy-900 group-hover:text-brand-700">{job.title}</h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-navy-500">{job.department}</p>
        </div>
        <Badge tone="success">Open</Badge>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-navy-600">{truncate(job.summary, 160)}</p>

      <dl className="mt-5 grid grid-cols-1 gap-2 text-xs text-navy-600 sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <Briefcase size={14} className="text-navy-400" aria-hidden />
          {job.employment_type} · {job.remote_status}
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-navy-400" aria-hidden />
          {job.location}
        </div>
        {job.salary_visible === 1 && (job.salary_min || job.salary_max) ? (
          <div className="flex items-center gap-1.5">
            <span className="text-navy-400" aria-hidden>
              K
            </span>
            {money(job.salary_min, job.salary_currency)} – {money(job.salary_max, job.salary_currency)}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-navy-400" aria-hidden />
            {job.positions} {job.positions === 1 ? 'position' : 'positions'}
          </div>
        )}
        {job.deadline && (
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-navy-400" aria-hidden />
            Closes {formatDate(job.deadline)}
          </div>
        )}
      </dl>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
        View role and apply
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ projects */

export function ProjectCard({ project }: { project: ProjectRow }) {
  return (
    <Link href={`/projects/${project.slug}`} className="card card-hover group overflow-hidden">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-navy-100">
        {project.cover_image ? (
          <Image
            src={project.cover_image}
            alt={project.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-navy-50 text-navy-400">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-brand-600">{project.client_label}</p>
        <h3 className="mt-2 text-lg font-semibold leading-snug text-navy-900">{project.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-600">{truncate(project.summary, 140)}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.services
            .split('\n')
            .filter(Boolean)
            .slice(0, 3)
            .map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------- opportunities */

export function OpportunityCard({ opportunity }: { opportunity: OpportunityRow }) {
  const category = OPPORTUNITY_CATEGORIES.find((c) => c.key === opportunity.category);
  return (
    <Link href={`/opportunities/${opportunity.slug}`} className="card card-hover group flex h-full flex-col p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={opportunity.is_regulated ? 'warning' : 'navy'}>{category?.label ?? opportunity.category}</Badge>
        {opportunity.industry && <Badge tone="neutral">{opportunity.industry}</Badge>}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-navy-900">{opportunity.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-600">{truncate(opportunity.summary, 170)}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-navy-500">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={13} className="text-navy-400" aria-hidden /> {opportunity.location}
        </span>
        {opportunity.closing_date && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} className="text-navy-400" aria-hidden /> Closes {formatDate(opportunity.closing_date)}
          </span>
        )}
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900">
        Read details
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- testimonial */

export function TestimonialCard({
  name,
  role,
  company,
  quote,
  rating,
  avatarPath,
}: {
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  avatarPath?: string | null;
}) {
  return (
    <figure className="card flex h-full flex-col p-6">
      <div className="flex items-center gap-1" aria-label={`${rating} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            aria-hidden
            className={cn(i < rating ? 'fill-gold-400 text-gold-400' : 'text-navy-200')}
          />
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-navy-700">“{quote}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <Avatar name={name} src={avatarPath} size={40} />
        <span>
          <span className="block text-sm font-semibold text-navy-900">{name}</span>
          <span className="block text-xs text-navy-500">
            {role}
            {company ? `, ${company}` : ''}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/* ----------------------------------------------------------------- statistic */

export function StatBlock({ value, label, tone = 'light' }: { value: string; label: string; tone?: 'light' | 'dark' }) {
  return (
    <div className="text-center">
      <p className={cn('text-3xl font-semibold tracking-tight sm:text-4xl', tone === 'dark' ? 'text-white' : 'text-navy-900')}>
        {value}
      </p>
      <p className={cn('mt-1.5 text-xs leading-snug sm:text-sm', tone === 'dark' ? 'text-navy-300' : 'text-navy-600')}>
        {label}
      </p>
    </div>
  );
}
