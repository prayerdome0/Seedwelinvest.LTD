import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { LEGAL_NAV } from '@/lib/nav';
import { getCompany } from '@/lib/settings';
import { formatDate } from '@/lib/utils';

export const revalidate = 3600;

interface LegalPage {
  slug: string;
  title: string;
  intro: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}

function pages(company: ReturnType<typeof getCompany>): LegalPage[] {
  return [
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      intro:
        'This policy explains how Seedwel Investment Limited collects, uses and protects personal information when you use this website, contact us, request a service or apply for a role.',
      updated: '2026-01-15',
      sections: [
        {
          heading: 'Who we are',
          body: [
            `${company.legalName} ("Seedwel", "we", "us") is a company registered in ${company.country} in ${company.year}, based in ${company.city}.`,
            'For any question about this policy or about your personal information, contact us using the details on the contact page.',
          ],
        },
        {
          heading: 'Information we collect',
          body: [
            'Information you give us: your name, email address, phone number, company, and the content of any message, service request or application you send us — including CVs and supporting documents.',
            'Information collected automatically: basic technical information such as browser type, pages visited and the date and time of your visit, used to keep the site secure and to understand what is useful.',
          ],
        },
        {
          heading: 'How we use your information',
          body: [
            'To reply to enquiries and provide the services you ask for.',
            'To assess job applications and manage recruitment.',
            'To administer the Seedwel Workplace platform for staff, clients and applicants.',
            'To send service notices and, where you have asked for it, updates about our work.',
            'To meet legal, accounting and regulatory obligations.',
          ],
        },
        {
          heading: 'Legal grounds and consent',
          body: [
            'We rely on your consent where you have given it (for example, when you submit an enquiry form), on our contract with you where we are delivering work, and on our legitimate interests in running and securing our business.',
            'You may withdraw consent at any time by contacting us. Withdrawing consent does not affect processing that has already taken place.',
          ],
        },
        {
          heading: 'Sharing your information',
          body: [
            'We do not sell your personal information.',
            'We share it only with service providers who help us operate (for example hosting, email delivery and payment processing), with professional advisers where necessary, and where the law requires us to.',
          ],
        },
        {
          heading: 'How long we keep information',
          body: [
            'Enquiries and service requests are kept for as long as needed to respond to you and to maintain our business records.',
            'Job applications are kept for the duration of the recruitment process and for a limited period afterwards for the talent pool, unless you ask us to delete them sooner.',
          ],
        },
        {
          heading: 'Security',
          body: [
            'We use access controls, encryption in transit, secure password storage and audit logging to protect personal information. No system can be guaranteed completely secure, but we take reasonable and proportionate measures and review them regularly.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'You may ask us for a copy of the personal information we hold about you, ask us to correct it, ask us to delete it, or object to how we use it.',
            'To make a request, contact us using the details on the contact page. We will respond within a reasonable period and may need to verify your identity first.',
          ],
        },
        {
          heading: 'Changes to this policy',
          body: [
            'We may update this policy. The most recent version is always published on this page with the date it was last updated.',
          ],
        },
      ],
    },
    {
      slug: 'terms-and-conditions',
      title: 'Terms & Conditions',
      intro:
        'These terms govern your use of the Seedwel Investment Limited website and the Seedwel Workplace platform. Please read them carefully.',
      updated: '2026-01-15',
      sections: [
        {
          heading: 'Use of this website',
          body: [
            'You may use this website for lawful purposes only. You must not attempt to gain unauthorised access to any part of the site, interfere with its operation, or use it to distribute harmful material.',
          ],
        },
        {
          heading: 'Information on this website',
          body: [
            'We work to keep the information on this website accurate and current, but it is provided for general information only and may change. Nothing on this website forms part of a contract unless it is expressly stated in a signed agreement.',
          ],
        },
        {
          heading: 'Services and engagements',
          body: [
            'Each engagement is governed by a written scope, quotation or contract agreed between Seedwel and the client. Where there is a conflict between these terms and a signed agreement, the signed agreement prevails for that engagement.',
          ],
        },
        {
          heading: 'Accounts and security',
          body: [
            'If you are given access to Seedwel Workplace, you are responsible for keeping your password confidential and for activity that takes place under your account. Tell us immediately if you believe your account has been compromised.',
            'We may suspend or disable an account where we reasonably believe it is being misused or where required for security.',
          ],
        },
        {
          heading: 'Intellectual property',
          body: [
            'The content, branding and design of this website belong to Seedwel Investment Limited unless stated otherwise. Client deliverables are owned as set out in the applicable engagement agreement.',
          ],
        },
        {
          heading: 'Liability',
          body: [
            'To the extent permitted by law, we are not liable for indirect or consequential loss arising from use of this website. Nothing in these terms limits liability that cannot lawfully be limited.',
          ],
        },
        {
          heading: 'Governing law',
          body: ['These terms are governed by the laws of the Republic of Zambia.'],
        },
      ],
    },
    {
      slug: 'cookie-policy',
      title: 'Cookie Policy',
      intro: 'This policy explains what cookies are used on this website and why.',
      updated: '2026-01-15',
      sections: [
        {
          heading: 'What cookies are',
          body: ['Cookies are small files stored on your device by your browser. They help websites remember things about your visit.'],
        },
        {
          heading: 'Cookies we use',
          body: [
            'Essential cookies: required for the site to work, including signing in to Seedwel Workplace and protecting forms against automated abuse. These cannot be turned off.',
            'Preference cookies: remember choices such as whether you dismissed a notice.',
            'Analytics: we aim to keep this to a minimum. Where analytics are used, they are configured to avoid identifying individual visitors where possible.',
          ],
        },
        {
          heading: 'Managing cookies',
          body: [
            'You can control cookies through your browser settings, including blocking or deleting them. Blocking essential cookies will prevent parts of the site — including signing in — from working.',
          ],
        },
      ],
    },
    {
      slug: 'application-privacy-notice',
      title: 'Application Privacy Notice',
      intro:
        'This notice explains how we handle your personal information when you apply for a role with Seedwel Investment Limited.',
      updated: '2026-01-15',
      sections: [
        {
          heading: 'What we collect',
          body: [
            'The details you enter in the application form: name, contact details, country and location, education, experience, skills, cover letter, portfolio link and any additional information you choose to give us.',
            'Your CV and any supporting documents you upload.',
            'Interview notes and any assessments, if you are shortlisted.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'To assess your application against the requirements of the role.',
            'To contact you about your application and to arrange interviews.',
            'To keep a record of our recruitment decisions.',
            'With your consent, to keep your details in our talent pool for future roles.',
          ],
        },
        {
          heading: 'Who can see it',
          body: [
            'Applications and CVs are visible only to authorised recruitment staff and to the managers involved in the specific role. Access is controlled by the platform and logged.',
          ],
        },
        {
          heading: 'No recruitment fees',
          body: [
            'Seedwel Investment Limited never charges a fee to apply for a role, to be considered, or to be offered work. If anyone asks you to pay in connection with a Seedwel recruitment process, please report it to us immediately.',
          ],
        },
        {
          heading: 'How long we keep it',
          body: [
            'We keep application records for the duration of the recruitment process and for a limited period afterwards. You may ask us to delete your details at any time.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'You may ask for a copy of your information, ask us to correct it, or ask us to delete it. Contact us using the details on the contact page.',
          ],
        },
      ],
    },
    {
      slug: 'website-disclaimer',
      title: 'Website Disclaimer',
      intro: 'Important information about how the content of this website should be read.',
      updated: '2026-01-15',
      sections: [
        {
          heading: 'General information only',
          body: [
            'The content of this website is provided for general information about Seedwel Investment Limited and the services we provide. It is not advice, and it should not be relied on as advice for any specific decision.',
          ],
        },
        {
          heading: 'No offer of securities',
          body: [
            company.investmentDisclaimer ||
              'Nothing on this website is an offer of securities to the public, an invitation to invest, or a solicitation of funds.',
            'Where an activity would constitute a regulated financial service, it is published only after the appropriate legal and licensing review. You can verify licensed market participants through the Securities and Exchange Commission of Zambia.',
          ],
        },
        {
          heading: 'Company verification',
          body: [
            company.registrationNote ||
              'Registered Zambian companies can be verified through the Patents and Companies Registration Agency (PACRA) business search facility.',
            'We encourage every prospective client, partner and applicant to carry out their own verification before entering into any commitment.',
          ],
        },
        {
          heading: 'Third-party links',
          body: [
            'Where we link to external websites, we do so for convenience only. We are not responsible for the content, accuracy or security of third-party sites.',
          ],
        },
        {
          heading: 'Availability',
          body: [
            'We work to keep this website available and secure, but we do not guarantee uninterrupted access and may take the site offline for maintenance or security reasons.',
          ],
        },
      ],
    },
  ];
}

export function generateStaticParams() {
  return LEGAL_NAV.map((item) => ({ slug: item.href.split('/').pop() as string }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pages(getCompany()).find((p) => p.slug === slug);
  if (!page) return { title: 'Not found' };
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `/legal/${page.slug}` },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = getCompany();
  const page = pages(company).find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-12 sm:py-16">
          <p className="eyebrow eyebrow-line text-brand-300">Legal</p>
          <h1 className="mt-4 max-w-3xl text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.025em] sm:text-[2.4rem]">
            {page.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-navy-200">{page.intro}</p>
          <p className="mt-3 text-xs text-navy-400">Last updated {formatDate(page.updated)}</p>
        </div>
      </section>

      <Section>
        <div className="container-page grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <Reveal>
            <nav className="lg:sticky lg:top-28" aria-label="Legal documents">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Legal</p>
              <ul className="mt-3 space-y-1">
                {LEGAL_NAV.map((item) => {
                  const active = item.href === `/legal/${page.slug}`;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          active ? 'bg-navy-50 font-semibold text-navy-900' : 'text-navy-600 hover:bg-navy-50'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </Reveal>

          <Reveal delay={60}>
            <article className="space-y-8">
              {page.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="heading-3">{section.heading}</h2>
                  <div className="mt-3 space-y-3">
                    {section.body.map((paragraph, i) => (
                      <p key={i} className="text-[0.95rem] leading-relaxed text-navy-600">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}

              <div className="rounded-2xl border border-navy-100 bg-mist p-5">
                <p className="text-xs leading-relaxed text-navy-600">
                  This document is provided as a starting template and should be reviewed by a qualified Zambian legal
                  practitioner before the website is used commercially. Contact {company.email || 'us'} with any
                  questions.
                </p>
              </div>
            </article>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
