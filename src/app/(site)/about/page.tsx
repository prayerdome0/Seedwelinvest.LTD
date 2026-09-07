import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Mail, Target, Eye, Heart } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { Paragraphs } from '@/components/ui/Prose';
import { ButtonLink } from '@/components/ui/Button';
import { getContentMap, getExtra, getLeadership } from '@/lib/data/site';
import { getCompany } from '@/lib/settings';
import { lines } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Seedwel Investment Limited is a Zambian operating company registered in 2025, delivering digital, branding, business support, talent and skills services.',
  alternates: { canonical: '/about' },
};

interface Value {
  title: string;
  body: string;
}

export default function AboutPage() {
  const company = getCompany();
  const blocks = getContentMap('about');
  const who = blocks['about.who_we_are'];
  const story = blocks['about.story'];
  const mission = blocks['about.mission'];
  const vision = blocks['about.vision'];
  const values = blocks['about.values'];
  const values2 = getExtra<Value[]>(values, 'items', []);
  const leaders = getLeadership();

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-14 sm:py-18 lg:py-20">
          <p className="eyebrow eyebrow-line text-brand-300">About us</p>
          <h1 className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.5rem] lg:text-[3rem]">
            A Zambian operating company, built to do practical work properly
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            {company.description}
          </p>
        </div>
      </section>

      <Section>
        <div className="container-page grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow eyebrow-line mb-3">{who?.subtitle}</p>
            <h2 className="heading-2">{who?.title}</h2>
            <div className="mt-5">
              <Paragraphs text={who?.body} />
            </div>
            <div className="mt-6 rounded-2xl border border-navy-100 bg-mist p-5">
              <p className="text-xs leading-relaxed text-navy-600">{company.registrationNote}</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy-100">
              <Image
                src={who?.image_path || '/images/about-team.jpg'}
                alt="The Seedwel team at work"
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
                priority
              />
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="mist">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="eyebrow eyebrow-line mb-3">Our story</p>
            <h2 className="heading-2">{story?.title}</h2>
            <div className="mt-5">
              <Paragraphs text={story?.body} />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="grid gap-5">
              <div className="card p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
                  <Target size={19} aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-navy-900">Our mission</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-navy-600">{mission?.body}</p>
              </div>
              <div className="card p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Eye size={19} aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-navy-900">Our vision</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-navy-600">{vision?.body}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section>
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Our values"
              title={values?.title || 'What we hold ourselves to'}
              subtitle={values?.subtitle}
            />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values2.map((value, i) => (
              <Reveal key={value.title} delay={i * 40}>
                <div className="card h-full p-6">
                  <Heart size={18} className="text-brand-500" aria-hidden />
                  <h3 className="mt-3 text-base font-semibold text-navy-900">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">{value.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="mist" id="leadership">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Leadership"
              title="The people responsible"
              subtitle="Seedwel is led by its Founder and Co-Director, both actively involved in the company’s work."
            />
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {leaders.map((leader, i) => (
              <Reveal key={leader.id} delay={i * 80}>
                <article className="card h-full overflow-hidden">
                  <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
                    <div className="relative aspect-[4/5] bg-navy-50 sm:aspect-auto">
                      {leader.image_path ? (
                        <Image src={leader.image_path} alt={leader.name} fill sizes="220px" className="object-cover" />
                      ) : (
                        <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 bg-gradient-to-br from-navy-50 to-navy-100 p-4 text-center">
                          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-navy-900 text-xl font-semibold text-white">
                            {leader.name
                              .split(' ')
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join('')}
                          </span>
                          <span className="text-2xs uppercase tracking-wider text-navy-500">Photograph to be added</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-brand-600">{leader.title}</p>
                      <h3 className="mt-1.5 text-xl font-semibold text-navy-900">{leader.name}</h3>
                      <p className="mt-1 text-xs text-navy-500">{leader.focus}</p>
                      <div className="mt-4">
                        <Paragraphs text={leader.bio} className="text-sm" />
                      </div>
                      {leader.message && (
                        <div className="mt-5 rounded-2xl border-l-2 border-brand-500 bg-navy-50/60 p-4">
                          <p className="text-2xs font-semibold uppercase tracking-wider text-navy-500">
                            Message from the {leader.title.toLowerCase()}
                          </p>
                          <div className="mt-2">
                            <Paragraphs text={leader.message} className="text-sm italic text-navy-700" />
                          </div>
                        </div>
                      )}
                      {leader.responsibilities && (
                        <div className="mt-5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                            Areas of responsibility
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {lines(leader.responsibilities).map((line) => (
                              <li key={line} className="flex items-start gap-2 text-sm text-navy-600">
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {leader.email && (
                        <a
                          href={`mailto:${leader.email}`}
                          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          <Mail size={15} aria-hidden /> {leader.email}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <div className="container-page">
          <div className="rounded-3xl border border-navy-100 bg-mist p-8 sm:p-10">
            <div className="grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="heading-3">Work with a team that treats your work like its own</h2>
                <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-navy-600">
                  Tell us what you need. You will receive a written scope, a price and a delivery date before any work
                  begins.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <ButtonLink href="/request-a-service" variant="accent" size="lg">
                  Request a Service
                </ButtonLink>
                <ButtonLink href="/services" variant="outline" size="lg">
                  View services
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
