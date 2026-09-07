import type { Metadata } from 'next';
import Image from 'next/image';
import { CalendarDays, Clock, GraduationCap, Layers, Signal } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { Paragraphs, BulletList } from '@/components/ui/Prose';
import { getContentBlock, getCourses } from '@/lib/data/site';
import { lines } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Education & Skills Development',
  description:
    'Practical computer, digital, business, mathematics and professional skills programmes from Seedwel Investment Limited in Zambia.',
  alternates: { canonical: '/education' },
};

export default function EducationPage() {
  const intro = getContentBlock('education.intro');
  const courses = getCourses();

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-14 sm:py-18 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="eyebrow eyebrow-line text-brand-300">Education & Skills</p>
              <h1 className="mt-4 max-w-2xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.5rem] lg:text-[3rem]">
                {intro?.title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">{intro?.subtitle}</p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10">
              <Image
                src={intro?.image_path || '/images/education.jpg'}
                alt="Learners developing practical digital skills"
                fill
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Programmes"
              title="What we teach"
              subtitle="Short, practical programmes built around the skills employers actually ask for."
            />
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {courses.map((course, i) => (
              <Reveal key={course.id} delay={i * 50}>
                <article className="card card-hover h-full overflow-hidden">
                  <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                    <div className="relative aspect-[16/10] bg-navy-100 sm:aspect-auto">
                      {course.image_path ? (
                        <Image
                          src={course.image_path}
                          alt=""
                          fill
                          sizes="180px"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full min-h-[140px] items-center justify-center bg-navy-50 text-navy-300">
                          <GraduationCap size={26} aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                        {course.category}
                      </p>
                      <h3 className="mt-1.5 text-lg font-semibold text-navy-900">{course.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-navy-600">{course.summary}</p>

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-navy-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} className="text-navy-400" aria-hidden /> {course.duration}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Signal size={13} className="text-navy-400" aria-hidden /> {course.level}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Layers size={13} className="text-navy-400" aria-hidden /> {course.mode}
                        </span>
                      </div>

                      {course.outcomes && (
                        <details className="group mt-4">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-navy-900">
                            What you will be able to do
                            <span className="ml-1 text-brand-600 group-open:hidden">+</span>
                            <span className="ml-1 hidden text-brand-600 group-open:inline">−</span>
                          </summary>
                          <div className="mt-3">
                            <BulletList items={lines(course.outcomes)} />
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="mist">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <SectionHeading eyebrow="How it works" title="Practical, assessed and honest" />
            <div className="mt-6">
              <Paragraphs text={intro?.body} />
            </div>
            <ul className="mt-6 space-y-3">
              {[
                'Small cohorts so everyone gets hands-on time',
                'Real tasks drawn from actual client and workplace situations',
                'Assessment based on what you can do, not memorised theory',
                'Certificates issued on completion and attendance',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-navy-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={80}>
            <div className="rounded-3xl border border-navy-100 bg-white p-8">
              <CalendarDays size={22} className="text-brand-500" aria-hidden />
              <h2 className="mt-4 heading-3">Enrol or partner with us</h2>
              <p className="mt-3 text-sm leading-relaxed text-navy-600">
                Programmes run in cohorts in Lusaka and online. Employers and training providers can partner with us to
                run cohorts for their teams or learners.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/contact" variant="accent">
                  Enquire about a programme
                </ButtonLink>
                <ButtonLink href="/opportunities/skills-training-partnership" variant="outline">
                  Partnership opportunity
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
