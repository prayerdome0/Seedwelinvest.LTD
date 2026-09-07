import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, GraduationCap, Handshake, Sparkles } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Section, SectionHeading } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { Paragraphs, BulletList } from '@/components/ui/Prose';
import { Icon } from '@/components/ui/Icon';
import {
  JobCard,
  OpportunityCard,
  ProjectCard,
  ServiceCard,
  StatBlock,
  TestimonialCard,
} from '@/components/site/cards';
import {
  getContentBlock,
  getExtra,
  getHomeStats,
  getJobs,
  getLeadership,
  getOpportunities,
  getProjects,
  getServices,
  getTestimonials,
} from '@/lib/data/site';
import { getCompany } from '@/lib/settings';
import { lines } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const company = getCompany();
  return {
    title: `${company.name} — ${company.tagline}`,
    description: company.seoDescription || company.description,
    alternates: { canonical: '/' },
    openGraph: {
      title: `${company.name} — ${company.tagline}`,
      description: company.seoDescription || company.description,
      images: [{ url: company.ogImage || '/og-default.jpg' }],
    },
  };
}

interface Reason {
  title: string;
  body: string;
}
interface Step {
  title: string;
  body: string;
}
interface Division {
  title: string;
  body: string;
  icon: string;
  image: string;
}

export default function HomePage() {
  const company = getCompany();
  const hero = getContentBlock('home.hero');
  const intro = getContentBlock('home.intro');
  const whatWeDo = getContentBlock('home.what_we_do');
  const servicesBlock = getContentBlock('home.services');
  const why = getContentBlock('home.why');
  const process = getContentBlock('home.process');
  const stats = getHomeStats();
  const opportunitiesBlock = getContentBlock('home.opportunities');
  const careersBlock = getContentBlock('home.careers');
  const projectsBlock = getContentBlock('home.projects');
  const testimonialsBlock = getContentBlock('home.testimonials');
  const leadershipBlock = getContentBlock('home.leadership');
  const cta = getContentBlock('home.cta');

  const divisions = getExtra<Division[]>(whatWeDo, 'items', []);
  const reasons = getExtra<Reason[]>(why, 'items', []);
  const steps = getExtra<Step[]>(process, 'items', []);

  const services = getServices({ featured: true, limit: 6 });
  const jobs = getJobs({ statuses: ['published'] });
  const projects = getProjects({ featured: true, limit: 3 });
  const opportunities = getOpportunities({ featured: true, limit: 3 });
  const testimonials = getTestimonials().slice(0, 3);
  const leaders = getLeadership();

  const heroImage = hero?.image_path || '/images/hero-office.jpg';

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="pointer-events-none absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-brand-600/20 blur-3xl" />
        <div className="container-page relative py-14 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div>
              {hero?.extra?.eyebrow && (
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-2xs font-semibold uppercase tracking-[0.14em] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden />
                  {hero.extra.eyebrow}
                </p>
              )}
              <h1 className="mt-5 max-w-2xl text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[2.75rem] lg:text-[3.35rem]">
                {hero?.title || company.tagline}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">
                {hero?.subtitle || company.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/services" variant="accent" size="lg">
                  {hero?.extra?.primary_label || 'Explore Our Services'}
                </ButtonLink>
                <ButtonLink
                  href="/request-a-service"
                  variant="white"
                  size="lg"
                  className="hidden sm:inline-flex"
                >
                  {hero?.extra?.secondary_label || 'Work With Us'}
                </ButtonLink>
                <ButtonLink
                  href="/careers"
                  variant="ghost"
                  size="lg"
                  className="border border-white/20 text-white hover:bg-white/10 hover:text-white"
                >
                  {hero?.extra?.tertiary_label || 'View Careers'}
                </ButtonLink>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-6 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-navy-300">Registered</dt>
                  <dd className="mt-0.5 font-semibold text-white">{company.year} · {company.country}</dd>
                </div>
                <div>
                  <dt className="text-navy-300">Divisions</dt>
                  <dd className="mt-0.5 font-semibold text-white">{divisions.length || 6} operating areas</dd>
                </div>
                <div>
                  <dt className="text-navy-300">Open roles</dt>
                  <dd className="mt-0.5 font-semibold text-white">
                    {jobs.length} position{jobs.length === 1 ? '' : 's'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 shadow-lift sm:aspect-[16/11]">
                <Image
                  src={heroImage}
                  alt="Seedwel Investment Limited team working with clients in Lusaka, Zambia"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 620px"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy-950/80 to-transparent" />
              </div>
              <div className="absolute -bottom-6 left-4 right-4 rounded-2xl border border-navy-100 bg-white p-4 shadow-lift sm:left-6 sm:right-auto sm:w-[300px]">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Verification</p>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-700">
                  Registered in Zambia in {company.year}. Verify any Zambian company through the PACRA business search.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ intro */}
      <Section className="pt-20 sm:pt-24">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="eyebrow eyebrow-line mb-3">{intro?.subtitle || 'Who we are'}</p>
            <h2 className="heading-2">{intro?.title}</h2>
            <div className="mt-5">
              <Paragraphs text={intro?.body} />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/about" variant="outline">
                Read our story
              </ButtonLink>
              <ButtonLink href="/what-we-do" variant="ghost">
                What we do <ArrowRight size={16} aria-hidden />
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy-100">
              <Image
                src={intro?.image_path || '/images/about-team.jpg'}
                alt="The Seedwel team reviewing plans with a client"
                fill
                sizes="(max-width: 1024px) 100vw, 620px"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* -------------------------------------------------------- what we do */}
      <Section tone="mist">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="What we do"
              title={whatWeDo?.title || 'Four divisions, one operating company'}
              subtitle={whatWeDo?.body}
            />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {divisions.map((division, i) => (
              <Reveal key={division.title} delay={i * 60}>
                <div className="card card-hover h-full overflow-hidden">
                  {division.image && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-navy-100">
                      <Image
                        src={division.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                        className="object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
                      <Icon name={division.icon} size={19} />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-navy-900">{division.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-navy-600">{division.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------- services */}
      <Section>
        <div className="container-page">
          <Reveal>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="Services"
                title={servicesBlock?.title || 'Practical services, delivered properly'}
                subtitle={servicesBlock?.body}
              />
              <ButtonLink href="/services" variant="outline" className="shrink-0">
                All services <ArrowRight size={16} aria-hidden />
              </ButtonLink>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <Reveal key={service.id} delay={i * 50}>
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------ why choose us */}
      <Section tone="mist">
        <div className="container-page grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <SectionHeading eyebrow="Why Seedwel" title={why?.title || 'What working with us is like'} subtitle={why?.body} />
            <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-6">
              <p className="text-sm leading-relaxed text-navy-600">
                We are an operating company, not a brochure. When you engage Seedwel you get a named person, a written
                scope and a record of every decision — visible to you in our client workspace.
              </p>
              <ul className="mt-4 space-y-2">
                {['Written scope before any payment', 'Documented approvals and revisions', 'One accountable point of contact'].map(
                  (item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-navy-700">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {reasons.map((reason, i) => (
              <Reveal key={reason.title} delay={i * 50}>
                <div className="card h-full p-6">
                  <h3 className="text-base font-semibold text-navy-900">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">{reason.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------ process */}
      <Section>
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="How we work"
              title={process?.title || 'A simple, transparent process'}
              subtitle={process?.subtitle}
            />
          </Reveal>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 60}>
                <li className="relative h-full rounded-2xl border border-navy-100 bg-white p-6">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold leading-snug text-navy-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      {/* -------------------------------------------------------------- stats */}
      <Section tone="navy" padded={false}>
        <div className="container-page py-12 sm:py-14">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <StatBlock key={stat.label} value={stat.value} label={stat.label} tone="dark" />
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------ opportunities */}
      {opportunities.length > 0 && (
        <Section>
          <div className="container-page">
            <Reveal>
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <SectionHeading
                  eyebrow="Opportunities"
                  title={opportunitiesBlock?.title || 'Ways to work with us'}
                  subtitle={opportunitiesBlock?.subtitle}
                />
                <ButtonLink href="/opportunities" variant="outline" className="shrink-0">
                  All opportunities <ArrowRight size={16} aria-hidden />
                </ButtonLink>
              </div>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((o, i) => (
                <Reveal key={o.id} delay={i * 60}>
                  <OpportunityCard opportunity={o} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------------ careers */}
      <Section tone="mist">
        <div className="container-page">
          <Reveal>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="Careers"
                title={careersBlock?.title || 'Build a career here'}
                subtitle={careersBlock?.subtitle}
              />
              <ButtonLink href="/careers" variant="outline" className="shrink-0">
                View all vacancies <ArrowRight size={16} aria-hidden />
              </ButtonLink>
            </div>
          </Reveal>
          {jobs.length > 0 ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job, i) => (
                <Reveal key={job.id} delay={i * 60}>
                  <JobCard job={job} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center">
              <p className="text-base font-semibold text-navy-900">There are no open vacancies right now</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-navy-600">
                New roles are published here as soon as they are approved. You can still send us your CV for future
                opportunities.
              </p>
              <div className="mt-5">
                <ButtonLink href="/contact" variant="outline">
                  Send your CV
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ----------------------------------------------------------- projects */}
      {projects.length > 0 && (
        <Section>
          <div className="container-page">
            <Reveal>
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <SectionHeading
                  eyebrow="Selected work"
                  title={projectsBlock?.title || 'Projects we have delivered'}
                  subtitle={projectsBlock?.subtitle}
                />
                <ButtonLink href="/projects" variant="outline" className="shrink-0">
                  All projects <ArrowRight size={16} aria-hidden />
                </ButtonLink>
              </div>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, i) => (
                <Reveal key={project.id} delay={i * 60}>
                  <ProjectCard project={project} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------- testimonials */}
      {testimonials.length > 0 && (
        <Section tone="mist">
          <div className="container-page">
            <Reveal>
              <SectionHeading
                eyebrow="Client feedback"
                title={testimonialsBlock?.title || 'What our clients say'}
                subtitle={testimonialsBlock?.subtitle}
              />
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.id} delay={i * 60}>
                  <TestimonialCard {...t} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* -------------------------------------------------------- leadership */}
      {leaders.length > 0 && (
        <Section>
          <div className="container-page">
            <Reveal>
              <SectionHeading
                eyebrow="Leadership"
                title={leadershipBlock?.title || 'Led by people who do the work'}
                subtitle={leadershipBlock?.subtitle}
              />
            </Reveal>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {leaders.map((leader, i) => (
                <Reveal key={leader.id} delay={i * 80}>
                  <div className="card h-full overflow-hidden">
                    <div className="grid gap-0 sm:grid-cols-[200px_1fr]">
                      <div className="relative aspect-[4/5] bg-navy-50 sm:aspect-auto">
                        {leader.image_path ? (
                          <Image
                            src={leader.image_path}
                            alt={leader.name}
                            fill
                            sizes="200px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 bg-gradient-to-br from-navy-50 to-navy-100 p-4 text-center">
                            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 text-lg font-semibold text-white">
                              {leader.name
                                .split(' ')
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join('')}
                            </span>
                            <span className="text-2xs uppercase tracking-wider text-navy-500">Photo to be added</span>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                          {leader.title}
                        </p>
                        <h3 className="mt-1.5 text-lg font-semibold text-navy-900">{leader.name}</h3>
                        {leader.focus && <p className="mt-1 text-xs text-navy-500">{leader.focus}</p>}
                        <p className="mt-3 text-sm leading-relaxed text-navy-600">{leader.short_bio}</p>
                        {leader.responsibilities && (
                          <ul className="mt-4 space-y-1.5">
                            {lines(leader.responsibilities)
                              .slice(0, 3)
                              .map((r) => (
                                <li key={r} className="flex items-start gap-2 text-xs text-navy-600">
                                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                                  {r}
                                </li>
                              ))}
                          </ul>
                        )}
                        <Link
                          href="/about#leadership"
                          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
                        >
                          Read more <ArrowRight size={15} aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* --------------------------------------------------------- education */}
      <Section tone="mist">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy-100">
              <Image
                src="/images/education.jpg"
                alt="Learners developing practical computer and digital skills"
                fill
                sizes="(max-width: 1024px) 100vw, 620px"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <p className="eyebrow eyebrow-line mb-3">Education & Skills</p>
            <h2 className="heading-2">Practical skills that lead to work</h2>
            <p className="mt-4 lead">
              Our Education & Skills division runs short, practical programmes in computer skills, digital marketing,
              online work, entrepreneurship and professional development — including for the people who deliver our
              client work.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {['Computer skills', 'Digital skills', 'Mathematics for business', 'Entrepreneurship'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-700">
                  <GraduationCap size={16} className="shrink-0 text-brand-500" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-7">
              <ButtonLink href="/education" variant="outline">
                Explore programmes <ArrowRight size={16} aria-hidden />
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* --------------------------------------------------------------- CTA */}
      <Section tone="navy" padded={false}>
        <div className="relative overflow-hidden">
          <div className="container-page py-16 lg:py-20">
            <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="inline-flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                  <Handshake size={15} aria-hidden /> Let’s talk
                </p>
                <h2 className="mt-4 text-[1.7rem] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[2.1rem]">
                  {cta?.title || 'Let’s build something practical'}
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-navy-200">
                  {cta?.subtitle ||
                    'Tell us what you need and we will come back with a clear scope, a price and a date.'}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href="/request-a-service" variant="accent" size="lg">
                    Request a Service
                  </ButtonLink>
                  <ButtonLink href="/contact" variant="white" size="lg">
                    Contact us
                  </ButtonLink>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Sparkles, label: 'Digital & creative delivery' },
                  { icon: Building2, label: 'Business support that holds' },
                  { icon: BadgeCheck, label: 'Trained people, real roles' },
                  { icon: Handshake, label: 'Partnerships and projects' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <item.icon size={20} className="text-brand-300" aria-hidden />
                    <p className="mt-3 text-sm leading-snug text-white">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
