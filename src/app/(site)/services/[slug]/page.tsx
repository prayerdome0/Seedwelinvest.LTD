import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, FileText, Phone } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Paragraphs } from '@/components/ui/Prose';
import { ServiceCard } from '@/components/site/cards';
import { DIVISION_LABELS, getServiceBySlug, getServices } from '@/lib/data/site';
import { getCompany } from '@/lib/settings';
import { lines } from '@/lib/utils';

export const revalidate = 30;

export async function generateStaticParams() {
  return getServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: 'Service not found' };
  return {
    title: service.name,
    description: service.summary,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title: `${service.name} | Seedwel Investment Limited`,
      description: service.summary,
      images: service.image_path ? [{ url: service.image_path }] : undefined,
    },
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();
  const company = getCompany();
  const related = getServices()
    .filter((s) => s.division === service.division && s.id !== service.id)
    .slice(0, 3);

  const benefits = lines(service.benefits);
  const process = lines(service.process);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.summary,
    provider: {
      '@type': 'Organization',
      name: company.legalName,
      areaServed: company.country,
      address: { '@type': 'PostalAddress', addressLocality: company.city, addressCountry: 'ZM' },
    },
    areaServed: { '@type': 'Country', name: 'Zambia' },
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
            <Link href="/services" className="hover:text-white">
              Services
            </Link>
            <span className="px-1.5">/</span>
            <span className="text-white/80">{service.name}</span>
          </nav>
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Icon name={service.icon} size={24} />
              </span>
              <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                {DIVISION_LABELS[service.division] ?? service.division}
              </p>
              <h1 className="mt-3 max-w-2xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.4rem]">
                {service.name}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-navy-200">{service.summary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={`/request-a-service?service=${service.slug}`} variant="accent" size="lg">
                  Request This Service
                  <ArrowRight size={16} aria-hidden />
                </ButtonLink>
                <ButtonLink
                  href="/contact"
                  variant="ghost"
                  size="lg"
                  className="border border-white/20 text-white hover:bg-white/10 hover:text-white"
                >
                  Ask a question
                </ButtonLink>
              </div>
              {service.starting_price && (
                <p className="mt-6 text-sm text-navy-300">
                  Indicative pricing: <span className="font-semibold text-white">{service.starting_price}</span>
                </p>
              )}
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10">
              {service.image_path && (
                <Image
                  src={service.image_path}
                  alt={service.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="object-cover"
                  priority
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <Reveal>
            <h2 className="heading-3">What this service includes</h2>
            <div className="mt-4">
              <Paragraphs text={service.description} />
            </div>

            {benefits.length > 0 && (
              <div className="mt-8 rounded-2xl border border-navy-100 bg-mist p-6">
                <h3 className="text-base font-semibold text-navy-900">Benefits</h3>
                <ul className="mt-3 space-y-2.5">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2.5 text-[0.95rem] text-navy-700">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {process.length > 0 && (
              <div className="mt-8">
                <h3 className="text-base font-semibold text-navy-900">How we deliver it</h3>
                <ol className="mt-4 space-y-3">
                  {process.map((step, i) => (
                    <li key={step} className="flex gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
                        {i + 1}
                      </span>
                      <span className="text-[0.95rem] leading-relaxed text-navy-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Reveal>

          <Reveal delay={80}>
            <aside className="space-y-5 lg:sticky lg:top-28">
              <div className="card p-6">
                <h3 className="text-base font-semibold text-navy-900">What you receive</h3>
                <ul className="mt-3 space-y-2">
                  {lines(service.deliverables).map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-navy-700">
                      <FileText size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-navy-900 p-6 text-white">
                <h3 className="text-base font-semibold">Ready to start?</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-200">
                  Send a request and we will come back with a written scope, a fixed price and a delivery date.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <ButtonLink href={`/request-a-service?service=${service.slug}`} variant="accent">
                    Request This Service
                  </ButtonLink>
                  {company.phone && (
                    <a
                      href={`tel:${company.phone.replace(/\s/g, '')}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                    >
                      <Phone size={15} aria-hidden /> {company.phone}
                    </a>
                  )}
                </div>
              </div>
            </aside>
          </Reveal>
        </div>
      </Section>

      {related.length > 0 && (
        <Section tone="mist">
          <div className="container-page">
            <h2 className="heading-3">More in {DIVISION_LABELS[service.division] ?? service.division}</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ServiceCard key={item.id} service={item} />
              ))}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
