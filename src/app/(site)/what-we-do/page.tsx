import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { Paragraphs, BulletList } from '@/components/ui/Prose';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { getContentBlock, getExtra, getServices } from '@/lib/data/site';
import { DIVISION_LABELS } from '@/lib/data/site';

export const metadata: Metadata = {
  title: 'What We Do',
  description:
    'Seedwel Investment Limited operates six divisions: digital solutions, branding and creative, business support and development, talent and recruitment, education and skills, and business opportunities.',
  alternates: { canonical: '/what-we-do' },
};

interface Division {
  title: string;
  body: string;
  icon: string;
  image: string;
}

const DIVISION_DETAIL: Record<string, string[]> = {
  'Digital Solutions': [
    'Business and company websites',
    'Web applications and internal tools',
    'E-commerce with local payment options',
    'Landing pages and campaign sites',
    'Website maintenance and security',
  ],
  'Branding & Creative': [
    'Logo and identity design',
    'Business cards, letterheads and print',
    'Posters, flyers and banners',
    'Social media and campaign graphics',
    'Company profiles and pitch documents',
  ],
  'Business Support & Development': [
    'Business and market research',
    'Digital marketing and campaigns',
    'Customer support setup and staffing',
    'Virtual assistance and administration',
    'Process documentation and improvement',
  ],
  'Talent & Recruitment': [
    'Role definition and scorecards',
    'Sourcing and screening',
    'Skills testing and interviews',
    'Placement and onboarding support',
    'Ongoing performance check-ins',
  ],
  'Education & Skills': [
    'Computer and digital skills',
    'Online and remote work skills',
    'Entrepreneurship and business planning',
    'Practical mathematics for business',
    'Professional workplace skills',
  ],
  'Business & Investment Opportunities': [
    'Partnerships with clear written terms',
    'Project collaborations',
    'Business opportunity information',
    'Due diligence and verification guidance',
  ],
};

export default function WhatWeDoPage() {
  const intro = getContentBlock('what-we-do.intro');
  const divisionsBlock = getContentBlock('what-we-do.divisions');
  const divisions = getExtra<Division[]>(divisionsBlock, 'items', []);
  const services = getServices();

  const byDivision = services.reduce<Record<string, typeof services>>((acc, service) => {
    acc[service.division] = acc[service.division] || [];
    acc[service.division].push(service);
    return acc;
  }, {});

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-14 sm:py-18 lg:py-20">
          <p className="eyebrow eyebrow-line text-brand-300">What we do</p>
          <h1 className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.5rem] lg:text-[3rem]">
            {intro?.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">{intro?.subtitle}</p>
        </div>
      </section>

      <Section>
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <Paragraphs text={intro?.body} />
          </Reveal>
          <Reveal delay={80}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy-100">
              <Image
                src={intro?.image_path || '/images/hero-office.jpg'}
                alt="Seedwel team collaborating with a client"
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
                priority
              />
            </div>
          </Reveal>
        </div>
      </Section>

      {divisions.map((division, index) => {
        const related = byDivision[
          Object.keys(DIVISION_LABELS).find((key) => DIVISION_LABELS[key] === division.title) || division.title.toLowerCase()
        ] ?? [];
        return (
          <Section key={division.title} tone={index % 2 === 0 ? 'mist' : 'white'} id={division.title.toLowerCase().replace(/\s+/g, '-')}>
            <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <Reveal>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white">
                  <Icon name={division.icon} size={22} />
                </span>
                <h2 className="mt-5 heading-3">{division.title}</h2>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-navy-600">{division.body}</p>
                {DIVISION_DETAIL[division.title] && (
                  <div className="mt-6">
                    <BulletList items={DIVISION_DETAIL[division.title]} />
                  </div>
                )}
                {related.length > 0 && (
                  <div className="mt-7">
                    <ButtonLink href="/services" variant="outline">
                      See services in this division <ArrowRight size={16} aria-hidden />
                    </ButtonLink>
                  </div>
                )}
              </Reveal>
              <Reveal delay={80}>
                {division.image && (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-navy-100">
                    <Image
                      src={division.image}
                      alt={division.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 720px"
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                {related.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {related.slice(0, 8).map((service) => (
                      <Link
                        key={service.id}
                        href={`/services/${service.slug}`}
                        className="chip transition hover:border-navy-300 hover:text-navy-900"
                      >
                        {service.name}
                      </Link>
                    ))}
                  </div>
                )}
              </Reveal>
            </div>
          </Section>
        );
      })}

      <Section tone="navy" padded={false}>
        <div className="container-page py-14 text-center">
          <h2 className="text-[1.6rem] font-semibold tracking-[-0.02em] text-white sm:text-[2rem]">
            Not sure which of these you need?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-navy-200">
            Describe what you are trying to achieve and we will tell you honestly which of our services fit — and which
            do not.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/request-a-service" variant="accent" size="lg">
              Request a Service
            </ButtonLink>
            <ButtonLink href="/contact" variant="white" size="lg">
              Talk to us
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
