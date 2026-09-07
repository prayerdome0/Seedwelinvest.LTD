import type { Metadata } from 'next';
import Image from 'next/image';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ContactForm } from '@/components/forms/ContactForm';
import { getCompany } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Seedwel Investment Limited in Lusaka, Zambia — email, phone, WhatsApp and our office hours.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const company = getCompany();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.legalName,
    url: company.siteUrl || undefined,
    email: company.email || undefined,
    telephone: company.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address,
      addressLocality: company.city,
      addressCountry: 'ZM',
    },
    foundingDate: company.year,
    areaServed: { '@type': 'Country', name: 'Zambia' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-14 sm:py-18 lg:py-20">
          <p className="eyebrow eyebrow-line text-brand-300">Contact</p>
          <h1 className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.5rem] lg:text-[3rem]">
            Talk to a person, not a form
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            Send us a message and a named member of the team will respond, usually within one working day.
          </p>
        </div>
      </section>

      <Section>
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal delay={80}>
            <div className="space-y-5">
              <div className="card divide-y divide-navy-100">
                {company.email && (
                  <div className="flex items-start gap-3 p-5">
                    <Mail size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Email</p>
                      <a href={`mailto:${company.email}`} className="mt-0.5 block break-all text-sm font-medium text-navy-900 hover:text-brand-600">
                        {company.email}
                      </a>
                    </div>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-start gap-3 p-5">
                    <Phone size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Phone</p>
                      <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="mt-0.5 block text-sm font-medium text-navy-900 hover:text-brand-600">
                        {company.phone}
                      </a>
                      {company.phoneAlt && (
                        <a href={`tel:${company.phoneAlt.replace(/\s/g, '')}`} className="mt-0.5 block text-sm text-navy-600 hover:text-brand-600">
                          {company.phoneAlt}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {company.whatsapp && (
                  <div className="flex items-start gap-3 p-5">
                    <MessageCircle size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">WhatsApp</p>
                      <a
                        href={`https://wa.me/${company.whatsapp.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-sm font-medium text-navy-900 hover:text-brand-600"
                      >
                        {company.whatsapp}
                      </a>
                    </div>
                  </div>
                )}
                {company.address && (
                  <div className="flex items-start gap-3 p-5">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Location</p>
                      <p className="mt-0.5 text-sm font-medium text-navy-900">{company.address}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 p-5">
                  <Clock size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Business hours</p>
                    <p className="mt-0.5 text-sm font-medium text-navy-900">{company.hours}</p>
                  </div>
                </div>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy-100">
                <Image
                  src="/images/contact.jpg"
                  alt="Seedwel Investment Limited office in Lusaka"
                  fill
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
              </div>

              <div className="rounded-2xl border border-navy-100 bg-mist p-5">
                <p className="text-xs leading-relaxed text-navy-600">{company.registrationNote}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
