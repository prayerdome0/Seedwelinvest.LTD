import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarDays, ExternalLink } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/Badge';
import { Paragraphs } from '@/components/ui/Prose';
import { getProjectBySlug, getProjects } from '@/lib/data/site';
import { formatDate, lines } from '@/lib/utils';

export const revalidate = 30;

export async function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return { title: 'Project not found' };
  return {
    title: project.name,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.name,
      description: project.summary,
      images: project.cover_image ? [{ url: project.cover_image }] : undefined,
    },
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const services = lines(project.services);
  const results = lines(project.results);
  const technologies = project.technologies
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-12 sm:py-16">
          <nav className="text-xs text-navy-300" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="px-1.5">/</span>
            <Link href="/projects" className="hover:text-white">
              Projects
            </Link>
            <span className="px-1.5">/</span>
            <span className="text-white/80">{project.name}</span>
          </nav>
          <div className="mt-6 max-w-3xl">
            <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-brand-300">{project.client_label}</p>
            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.4rem]">
              {project.name}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-navy-200">{project.summary}</p>
          </div>
        </div>
      </section>

      <Section>
        <div className="container-page">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-navy-100">
            {project.cover_image && (
              <Image
                src={project.cover_image}
                alt={project.name}
                fill
                sizes="(max-width: 1024px) 100vw, 1200px"
                className="object-cover"
                priority
              />
            )}
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
            <Reveal>
              <h2 className="heading-3">The work</h2>
              <div className="mt-4">
                <Paragraphs text={project.description} />
              </div>

              {results.length > 0 && (
                <div className="mt-8 rounded-2xl border border-navy-100 bg-mist p-6">
                  <h3 className="text-base font-semibold text-navy-900">Outcome</h3>
                  <ul className="mt-3 space-y-2.5">
                    {results.map((result) => (
                      <li key={result} className="flex items-start gap-2.5 text-[0.95rem] text-navy-700">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                        {result}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Reveal>

            <Reveal delay={80}>
              <aside className="space-y-5">
                <div className="card p-6">
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Client</dt>
                      <dd className="mt-1 text-navy-800">{project.client_label}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Status</dt>
                      <dd className="mt-1.5">
                        <StatusPill status={project.status} />
                      </dd>
                    </div>
                    {project.start_date && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Started</dt>
                        <dd className="mt-1 inline-flex items-center gap-1.5 text-navy-800">
                          <CalendarDays size={14} className="text-navy-400" aria-hidden />
                          {formatDate(project.start_date)}
                        </dd>
                      </div>
                    )}
                    {project.deadline && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                          {project.status === 'completed' ? 'Completed' : 'Target date'}
                        </dt>
                        <dd className="mt-1 inline-flex items-center gap-1.5 text-navy-800">
                          <CalendarDays size={14} className="text-navy-400" aria-hidden />
                          {formatDate(project.deadline)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Visit the site <ExternalLink size={14} aria-hidden />
                    </a>
                  )}
                </div>

                {services.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-base font-semibold text-navy-900">Services provided</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {services.map((service) => (
                        <span key={service} className="chip">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {technologies.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-base font-semibold text-navy-900">Built with</h3>
                    <p className="mt-2 text-sm text-navy-600">{technologies.join(' · ')}</p>
                  </div>
                )}

                <div className="rounded-2xl bg-navy-900 p-6 text-white">
                  <h3 className="text-base font-semibold">Need something similar?</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-200">
                    Tell us what you have in mind and we will scope it properly.
                  </p>
                  <ButtonLink href="/request-a-service" variant="accent" className="mt-5 w-full">
                    Request a Service <ArrowRight size={16} aria-hidden />
                  </ButtonLink>
                </div>
              </aside>
            </Reveal>
          </div>
        </div>
      </Section>
    </>
  );
}
