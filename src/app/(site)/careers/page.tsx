import type { Metadata } from 'next';
import Image from 'next/image';
import { ClipboardCheck, GraduationCap, Users } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { JobCard } from '@/components/site/cards';
import { getContentBlock, getJobs } from '@/lib/data/site';
import { CvTalentPoolForm } from '@/components/forms/CvTalentPoolForm';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Current vacancies at Seedwel Investment Limited in Zambia, including Cold Caller and Virtual Assistant positions. Apply online.',
  alternates: { canonical: '/careers' },
};

const PROCESS = [
  { title: 'Apply online', body: 'Complete the application form for the role you want and attach your CV.' },
  { title: 'We review', body: 'Our recruitment team reads every application and screens against the role requirements.' },
  { title: 'Interview', body: 'Shortlisted candidates are invited to an interview — online or in Lusaka.' },
  { title: 'Offer & onboarding', body: 'Successful candidates receive a written offer, then complete registration.' },
];

export default function CareersPage() {
  const intro = getContentBlock('careers.intro');
  const jobs = getJobs({ statuses: ['published'] });

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-14 sm:py-18 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="eyebrow eyebrow-line text-brand-300">Careers</p>
              <h1 className="mt-4 max-w-2xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.5rem] lg:text-[3rem]">
                {intro?.title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">{intro?.subtitle}</p>
              <div className="mt-8">
                <ButtonLink href="#openings" variant="accent" size="lg">
                  View open positions ({jobs.length})
                </ButtonLink>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10">
              <Image
                src={intro?.image_path || '/images/service-talent.jpg'}
                alt="Members of the Seedwel team at work"
                fill
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <Section id="openings">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Open positions"
              title={jobs.length > 0 ? `${jobs.length} position${jobs.length === 1 ? '' : 's'} open now` : 'No open positions right now'}
              subtitle="Only approved vacancies are published here. New roles appear as soon as they are approved."
            />
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
            <div className="mt-8 rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 p-8 text-center">
              <p className="text-base font-semibold text-navy-900">There are no open vacancies at the moment</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-navy-600">
                New roles are published here as soon as they are approved. You can still join our talent pool below.
              </p>
            </div>
          )}
        </div>
      </Section>

      <Section tone="mist">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <SectionHeading eyebrow="How hiring works" title="A fair, documented process" />
            <ol className="mt-8 space-y-4">
              {PROCESS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-base font-semibold text-navy-900">{step.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-navy-600">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={80}>
            <div className="card p-6 sm:p-8">
              <h2 className="heading-3">Join our talent pool</h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                If there is no suitable vacancy today, send us your details. We review the talent pool first when a new
                role opens.
              </p>
              <div className="mt-6">
                <CvTalentPoolForm />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section>
        <div className="container-page grid gap-5 sm:grid-cols-3">
          {[
            { icon: Users, title: 'We train for skill', body: 'Every new team member completes onboarding and role training before taking on client work.' },
            { icon: GraduationCap, title: 'Room to grow', body: 'Strong performers move into coordination, task management and specialist roles.' },
            { icon: ClipboardCheck, title: 'Clear expectations', body: 'Your tasks, targets and feedback live in one place — no guessing about how you are doing.' },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 60}>
              <div className="card h-full p-6">
                <item.icon size={20} className="text-brand-500" aria-hidden />
                <h3 className="mt-3 text-base font-semibold text-navy-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
