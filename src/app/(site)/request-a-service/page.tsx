import type { Metadata } from 'next';
import { CheckCircle2, Clock, FileText, ShieldCheck } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ServiceRequestForm } from '@/components/forms/ServiceRequestForm';
import { getServices } from '@/lib/data/site';
import { getCompany } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Request a Service',
  description:
    'Tell Seedwel Investment Limited what you need. Send a service request and receive a written scope, a price and a delivery date.',
  alternates: { canonical: '/request-a-service' },
};

export default async function RequestServicePage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  const services = getServices().map((s) => ({ id: s.id, name: s.name, division: s.division }));
  const preselected = service ? services.find((s) => s.name.toLowerCase().replace(/&/g, 'and').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') === service)?.id : undefined;
  const company = getCompany();

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-14 sm:py-18 lg:py-20">
          <p className="eyebrow eyebrow-line text-brand-300">Request a service</p>
          <h1 className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.5rem] lg:text-[3rem]">
            Tell us what you need
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            Complete the form and our team will come back with a written scope, a fixed price and a realistic delivery
            date — usually within two working days.
          </p>
        </div>
      </section>

      <Section>
        <div className="container-page grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <Reveal>
            <ServiceRequestForm services={services} preselected={preselected} />
          </Reveal>

          <Reveal delay={80}>
            <aside className="space-y-5">
              <div className="card p-6">
                <h2 className="text-base font-semibold text-navy-900">What happens next</h2>
                <ol className="mt-4 space-y-3">
                  {[
                    'We read your request and confirm receipt.',
                    'We ask any clarifying questions (by email, phone or WhatsApp).',
                    'You receive a written scope, price and delivery date.',
                    'Once approved, work starts and you can follow progress in your client workspace.',
                  ].map((step, i) => (
                    <li key={step} className="flex gap-3">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-navy-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-2xl border border-navy-100 bg-mist p-6">
                <ul className="space-y-3">
                  {[
                    { icon: Clock, text: 'Response within one to two working days' },
                    { icon: FileText, text: 'Written scope before any payment' },
                    { icon: CheckCircle2, text: 'You approve deliverables before sign-off' },
                    { icon: ShieldCheck, text: 'Your documents are stored with access controls' },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-2.5 text-sm text-navy-700">
                      <item.icon size={16} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-navy-900 p-6 text-white">
                <h2 className="text-base font-semibold">Prefer to talk?</h2>
                <p className="mt-2 text-sm leading-relaxed text-navy-200">
                  {company.phone ? `Call or WhatsApp us on ${company.phone}. ` : ''}
                  {company.hours}
                </p>
                <a
                  href="/contact"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50"
                >
                  Open the contact page
                </a>
              </div>
            </aside>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
