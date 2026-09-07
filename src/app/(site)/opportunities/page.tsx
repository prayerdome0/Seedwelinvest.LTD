import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { Paragraphs } from '@/components/ui/Prose';
import { EmptyState } from '@/components/ui/Section';
import { ButtonLink } from '@/components/ui/Button';
import { OpportunityCard } from '@/components/site/cards';
import { getContentBlock, getOpportunities } from '@/lib/data/site';
import { getCompany } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Business & Investment Opportunities',
  description:
    'Current business opportunities, partnerships and project collaborations from Seedwel Investment Limited in Zambia, with the safeguards that apply to each.',
  alternates: { canonical: '/opportunities' },
};

export default function OpportunitiesPage() {
  const intro = getContentBlock('opportunities.intro');
  const company = getCompany();
  const opportunities = getOpportunities();

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-14 sm:py-18 lg:py-20">
          <p className="eyebrow eyebrow-line text-brand-300">Opportunities</p>
          <h1 className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.5rem] lg:text-[3rem]">
            {intro?.title}
          </h1>
          <div className="mt-5 max-w-2xl text-navy-200">
            <Paragraphs text={intro?.subtitle} className="!text-navy-200 [&_p]:text-navy-200" />
          </div>
        </div>
      </section>

      <Section tone="mist" padded={false}>
        <div className="container-page py-5">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
            <p className="text-sm leading-relaxed text-amber-900">
              {company.investmentDisclaimer}
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <div className="container-page">
          {opportunities.length === 0 ? (
            <EmptyState
              title="No opportunities are published at the moment"
              description="New opportunities are published here as soon as they are approved."
              action={<ButtonLink href="/contact">Talk to us</ButtonLink>}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((opportunity, i) => (
                <Reveal key={opportunity.id} delay={i * 50}>
                  <OpportunityCard opportunity={opportunity} />
                </Reveal>
              ))}
            </div>
          )}

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              {
                title: 'Verify a company',
                body: 'Registered Zambian companies can be verified through the Patents and Companies Registration Agency (PACRA) business search facility.',
              },
              {
                title: 'Verify a licence',
                body: 'Licensed market participants can be verified through the Securities and Exchange Commission of Zambia.',
              },
              {
                title: 'Ask us directly',
                body: 'If you are considering any opportunity, ask for written documentation and take independent advice before committing funds.',
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 60}>
                <div className="card h-full p-6">
                  <h2 className="text-base font-semibold text-navy-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
