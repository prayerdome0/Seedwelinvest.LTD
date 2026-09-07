import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ApplicationForm } from '@/components/forms/ApplicationForm';
import { getJobBySlug } from '@/lib/data/site';
import { formatDate } from '@/lib/utils';

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) return { title: 'Vacancy not found' };
  return {
    title: `Apply — ${job.title}`,
    description: `Apply for the ${job.title} position at Seedwel Investment Limited.`,
    robots: { index: true, follow: true },
  };
}

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job || job.status !== 'published') notFound();

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-12 sm:py-14">
          <nav className="text-xs text-navy-300" aria-label="Breadcrumb">
            <Link href="/careers" className="hover:text-white">
              Careers
            </Link>
            <span className="px-1.5">/</span>
            <Link href={`/careers/${job.slug}`} className="hover:text-white">
              {job.title}
            </Link>
            <span className="px-1.5">/</span>
            <span className="text-white/80">Apply</span>
          </nav>
          <h1 className="mt-5 max-w-2xl text-[1.8rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[2.2rem]">
            Apply for {job.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-navy-200">
            Complete the form below. You will receive a confirmation and a reference number as soon as your application
            is received.
            {job.deadline ? ` Applications close ${formatDate(job.deadline)}.` : ''}
          </p>
        </div>
      </section>

      <Section>
        <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14">
          <ApplicationForm jobId={job.id} jobTitle={job.title} />

          <aside className="space-y-5">
            <div className="rounded-2xl border border-navy-100 bg-mist p-6">
              <h2 className="text-sm font-semibold text-navy-900">Before you start</h2>
              <ul className="mt-3 space-y-2 text-sm text-navy-600">
                <li>Have your CV ready (PDF, Word or image, max 15 MB).</li>
                <li>Write a short cover letter — a few honest sentences beat a template.</li>
                <li>Check your phone number: we contact shortlisted candidates by phone and email.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-navy-100 bg-white p-6">
              <ShieldCheck size={20} className="text-brand-500" aria-hidden />
              <h2 className="mt-3 text-sm font-semibold text-navy-900">How your data is handled</h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                Your application is stored securely and is visible only to authorised recruitment staff. We never charge
                a fee to apply or to be considered for a role. Read the{' '}
                <Link href="/legal/application-privacy-notice" className="font-medium text-brand-600 underline">
                  Application Privacy Notice
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
