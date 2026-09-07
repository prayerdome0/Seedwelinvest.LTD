import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, CalendarDays, Mail, MapPin, Phone, ShieldAlert } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { Badge } from '@/components/ui/Badge';
import { Paragraphs, BulletList } from '@/components/ui/Prose';
import { OpportunityInterestForm } from '@/components/forms/OpportunityInterestForm';
import { getOpportunities, getOpportunityBySlug } from '@/lib/data/site';
import { getCompany } from '@/lib/settings';
import { formatDate, lines } from '@/lib/utils';
import { OPPORTUNITY_CATEGORIES } from '@/lib/rbac';

export const revalidate = 30;

export async function generateStaticParams() {
  return getOpportunities().map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const opportunity = getOpportunityBySlug(slug);
  if (!opportunity || opportunity.status !== 'published') return { title: 'Opportunity not found' };
  return {
    title: opportunity.title,
    description: opportunity.summary,
    alternates: { canonical: `/opportunities/${opportunity.slug}` },
  };
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const opportunity = getOpportunityBySlug(slug);
  if (!opportunity || opportunity.status !== 'published') notFound();
  const company = getCompany();

  const category = OPPORTUNITY_CATEGORIES.find((c) => c.key === opportunity.category);
  const requirements = lines(opportunity.requirements);
  const isRegulated = opportunity.is_regulated === 1;

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-12 sm:py-16">
          <nav className="text-xs text-navy-300" aria-label="Breadcrumb">
            <Link href="/opportunities" className="hover:text-white">
              Opportunities
            </Link>
            <span className="px-1.5">/</span>
            <span className="text-white/80">{opportunity.title}</span>
          </nav>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone={isRegulated ? 'warning' : 'navy'}>{category?.label ?? opportunity.category}</Badge>
            {opportunity.industry && <Badge tone="neutral">{opportunity.industry}</Badge>}
          </div>
          <h1 className="mt-4 max-w-3xl text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.025em] sm:text-[2.4rem]">
            {opportunity.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy-200">{opportunity.summary}</p>
        </div>
      </section>

      <Section>
        <div className="container-page grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
          <Reveal>
            {(opportunity.disclaimer || company.investmentDisclaimer) && (
              <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                <p className="text-sm leading-relaxed text-amber-900">
                  {opportunity.disclaimer || company.investmentDisclaimer}
                </p>
              </div>
            )}

            <h2 className="heading-3">Details</h2>
            <div className="mt-4">
              <Paragraphs text={opportunity.description} />
            </div>

            {requirements.length > 0 && (
              <div className="mt-8">
                <h2 className="heading-3">What we are looking for</h2>
                <div className="mt-4">
                  <BulletList items={requirements} />
                </div>
              </div>
            )}
          </Reveal>

          <Reveal delay={80}>
            <aside className="space-y-5 lg:sticky lg:top-28">
              <div className="card p-6">
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Category</dt>
                    <dd className="mt-1 font-medium text-navy-900">{category?.label ?? opportunity.category}</dd>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="mt-0.5 text-navy-400" aria-hidden />
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Location</dt>
                      <dd className="mt-1 text-navy-800">{opportunity.location}</dd>
                    </div>
                  </div>
                  {opportunity.investment_range && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Indicative range</dt>
                      <dd className="mt-1 text-navy-800">{opportunity.investment_range}</dd>
                    </div>
                  )}
                  {opportunity.closing_date && (
                    <div className="flex items-start gap-2">
                      <CalendarDays size={15} className="mt-0.5 text-navy-400" aria-hidden />
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">Closes</dt>
                        <dd className="mt-1 text-navy-800">{formatDate(opportunity.closing_date)}</dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>

              <div className="card p-6">
                <h2 className="text-base font-semibold text-navy-900">Contact for this opportunity</h2>
                <ul className="mt-3 space-y-2 text-sm text-navy-700">
                  {opportunity.contact_name && (
                    <li className="flex items-center gap-2">
                      <Building2 size={15} className="text-navy-400" aria-hidden /> {opportunity.contact_name}
                    </li>
                  )}
                  {opportunity.contact_email && (
                    <li className="flex items-center gap-2">
                      <Mail size={15} className="text-navy-400" aria-hidden />
                      <a href={`mailto:${opportunity.contact_email}`} className="break-all hover:text-brand-600">
                        {opportunity.contact_email}
                      </a>
                    </li>
                  )}
                  {opportunity.contact_phone && (
                    <li className="flex items-center gap-2">
                      <Phone size={15} className="text-navy-400" aria-hidden /> {opportunity.contact_phone}
                    </li>
                  )}
                </ul>
              </div>
            </aside>
          </Reveal>
        </div>
      </Section>

      <Section tone="mist">
        <div className="container-page">
          <div className="mx-auto max-w-2xl">
            <h2 className="heading-3 text-center">Express interest</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-navy-600">
              Tell us what you would like to discuss. We will respond within two working days.
            </p>
            <div className="mt-8">
              <OpportunityInterestForm opportunityId={opportunity.id} ctaLabel="Express Interest" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
