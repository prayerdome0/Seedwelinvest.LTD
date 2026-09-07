import type { Metadata } from 'next';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { ServiceCard } from '@/components/site/cards';
import { getContentBlock, getServices, DIVISION_LABELS } from '@/lib/data/site';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Digital solutions, branding and creative, business support and development, and talent services from Seedwel Investment Limited in Zambia.',
  alternates: { canonical: '/services' },
};

export default function ServicesPage() {
  const intro = getContentBlock('services.intro');
  const services = getServices();

  const grouped = Object.keys(DIVISION_LABELS)
    .map((key) => ({ key, label: DIVISION_LABELS[key], items: services.filter((s) => s.division === key) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-14 sm:py-18 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="eyebrow eyebrow-line text-brand-300">Services</p>
              <h1 className="mt-4 max-w-2xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.5rem] lg:text-[3rem]">
                {intro?.title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">{intro?.subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/request-a-service" variant="accent" size="lg">
                  Request a Service
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
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10">
              <Image
                src={intro?.image_path || '/images/service-digital.jpg'}
                alt="Seedwel digital delivery team at work"
                fill
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <Section tone="mist" padded={false}>
        <div className="container-page py-5">
          <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1" aria-label="Service divisions">
            {grouped.map((group) => (
              <a
                key={group.key}
                href={`#${group.key}`}
                className="chip shrink-0 whitespace-nowrap transition hover:border-navy-300 hover:text-navy-900"
              >
                {group.label} ({group.items.length})
              </a>
            ))}
          </nav>
        </div>
      </Section>

      {grouped.map((group) => (
        <Section key={group.key} id={group.key}>
          <div className="container-page">
            <Reveal>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="eyebrow eyebrow-line mb-2">Division</p>
                  <h2 className="heading-2">{group.label}</h2>
                </div>
                <p className="max-w-md text-sm text-navy-600">
                  {group.items.length} service{group.items.length === 1 ? '' : 's'} in this division. Every engagement
                  starts with a written scope.
                </p>
              </div>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((service, i) => (
                <Reveal key={service.id} delay={i * 50}>
                  <ServiceCard service={service} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      ))}
    </>
  );
}
