import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Briefcase, CalendarDays, MapPin, Users, Wallet } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Paragraphs, BulletList } from '@/components/ui/Prose';
import { getJobBySlug, getJobs } from '@/lib/data/site';
import { formatDate, lines, money } from '@/lib/utils';

export const revalidate = 30;

export async function generateStaticParams() {
  return getJobs({ statuses: ['published'] }).map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job || job.status !== 'published') return { title: 'Vacancy not found' };
  return {
    title: `${job.title} — Careers`,
    description: job.summary,
    alternates: { canonical: `/careers/${job.slug}` },
    openGraph: { title: `${job.title} at Seedwel Investment Limited`, description: job.summary },
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job || job.status !== 'published') notFound();

  const responsibilities = lines(job.responsibilities);
  const requirements = lines(job.requirements);
  const skills = job.skills.split(',').map((s) => s.trim()).filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    validThrough: job.deadline ?? undefined,
    employmentType: job.employment_type.toUpperCase().replace(/\s|-/g, '_'),
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Seedwel Investment Limited',
      sameAs: 'https://seedwelinvest.example',
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'ZM' },
    },
    applicantLocationRequirements: { '@type': 'Country', name: 'Zambia' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-12 sm:py-16">
          <nav className="text-xs text-navy-300" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="px-1.5">/</span>
            <Link href="/careers" className="hover:text-white">
              Careers
            </Link>
            <span className="px-1.5">/</span>
            <span className="text-white/80">{job.title}</span>
          </nav>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">Open</Badge>
                {job.department && <Badge tone="navy">{job.department}</Badge>}
              </div>
              <h1 className="mt-4 text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.4rem]">
                {job.title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-navy-200">{job.summary}</p>
            </div>
            <div className="w-full max-w-sm">
              <div className="rounded-2xl bg-white/5 p-6">
                <p className="text-sm font-medium text-navy-200">Ready to apply?</p>
                <p className="mt-1 text-xs text-navy-300">
                  {job.deadline ? `Applications close ${formatDate(job.deadline)}` : 'Open until filled'}
                </p>
                <ButtonLink href={`/careers/${job.slug}/apply`} variant="accent" size="lg" className="mt-4 w-full">
                  Apply Now <ArrowRight size={16} aria-hidden />
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="container-page grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
          <Reveal>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Briefcase, label: 'Employment type', value: `${job.employment_type} · ${job.remote_status}` },
                { icon: MapPin, label: 'Location', value: job.location },
                {
                  icon: Wallet,
                  label: 'Compensation',
                  value:
                    job.salary_visible === 1 && (job.salary_min || job.salary_max)
                      ? `${money(job.salary_min, job.salary_currency)} – ${money(job.salary_max, job.salary_currency)} / month`
                      : 'Shared with shortlisted candidates',
                },
                { icon: Users, label: 'Positions', value: `${job.positions} available` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-navy-100 bg-white p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-500">
                    <item.icon size={14} aria-hidden /> {item.label}
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-navy-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h2 className="heading-3">About the role</h2>
              <div className="mt-4">
                <Paragraphs text={job.description} />
              </div>
            </div>

            {responsibilities.length > 0 && (
              <div className="mt-8">
                <h2 className="heading-3">What you will do</h2>
                <div className="mt-4">
                  <BulletList items={responsibilities} />
                </div>
              </div>
            )}

            {requirements.length > 0 && (
              <div className="mt-8">
                <h2 className="heading-3">What you need</h2>
                <div className="mt-4">
                  <BulletList items={requirements} />
                </div>
              </div>
            )}

            {skills.length > 0 && (
              <div className="mt-8">
                <h2 className="heading-3">Skills we look for</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Reveal>

          <Reveal delay={80}>
            <aside className="space-y-5 lg:sticky lg:top-28">
              <div className="card p-6">
                <h2 className="text-base font-semibold text-navy-900">Application timeline</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-navy-600">Posted</dt>
                    <dd className="font-medium text-navy-900">{formatDate(job.created_at)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-navy-600">Closing date</dt>
                    <dd className="inline-flex items-center gap-1.5 font-medium text-navy-900">
                      <CalendarDays size={14} className="text-navy-400" aria-hidden />
                      {job.deadline ? formatDate(job.deadline) : 'Until filled'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-navy-600">Positions</dt>
                    <dd className="font-medium text-navy-900">{job.positions}</dd>
                  </div>
                </dl>
                <ButtonLink href={`/careers/${job.slug}/apply`} variant="accent" className="mt-5 w-full">
                  Apply Now
                </ButtonLink>
              </div>

              <div className="rounded-2xl bg-navy-900 p-6 text-white">
                <h2 className="text-base font-semibold">Questions first?</h2>
                <p className="mt-2 text-sm leading-relaxed text-navy-200">
                  Send us a message and our recruitment team will get back to you.
                </p>
                <ButtonLink href="/contact" variant="white" className="mt-5 w-full">
                  Contact us
                </ButtonLink>
              </div>

              <p className="text-xs leading-relaxed text-navy-500">
                Seedwel Investment Limited is an equal opportunity employer. We read every application and never charge a
                fee at any stage of recruitment.
              </p>
            </aside>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
