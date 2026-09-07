import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, Phone, MessageCircle } from 'lucide-react';
import type { CompanyInfo } from '@/lib/settings';
import { FOOTER_NAV, LEGAL_NAV } from '@/lib/nav';

export default function SiteFooter({ company }: { company: CompanyInfo }) {
  const year = new Date().getFullYear();
  const socials = [
    { label: 'LinkedIn', href: company.linkedin },
    { label: 'Facebook', href: company.facebook },
    { label: 'X', href: company.x },
    { label: 'Instagram', href: company.instagram },
    { label: 'TikTok', href: company.tiktok },
  ].filter((s) => !!s.href);

  return (
    <footer className="bg-navy-900 text-navy-200">
      <div className="container-page py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(3,1fr)_1.2fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5">
                <Image src="/logo.png" alt="Seedwel Investment Limited" width={40} height={40} className="h-full w-full" />
              </span>
              <span className="text-base font-semibold text-white">Seedwel Investment Limited</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
              A Zambian company building opportunities and delivering practical business, digital and professional
              services — connecting people, businesses and projects for sustainable growth.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-navy-400">{company.registrationNote}</p>
          </div>

          {FOOTER_NAV.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{group.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-navy-300 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm text-navy-300">
              {company.email && (
                <li className="flex gap-2.5">
                  <Mail size={16} className="mt-0.5 shrink-0 text-brand-400" aria-hidden />
                  <a href={`mailto:${company.email}`} className="break-all hover:text-white">
                    {company.email}
                  </a>
                </li>
              )}
              {company.phone && (
                <li className="flex gap-2.5">
                  <Phone size={16} className="mt-0.5 shrink-0 text-brand-400" aria-hidden />
                  <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="hover:text-white">
                    {company.phone}
                  </a>
                </li>
              )}
              {company.whatsapp && (
                <li className="flex gap-2.5">
                  <MessageCircle size={16} className="mt-0.5 shrink-0 text-brand-400" aria-hidden />
                  <a
                    href={`https://wa.me/${company.whatsapp.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    WhatsApp {company.whatsapp}
                  </a>
                </li>
              )}
              {company.address && (
                <li className="flex gap-2.5">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-brand-400" aria-hidden />
                  <span>
                    {company.address}
                    <span className="mt-1 block text-xs text-navy-400">{company.hours}</span>
                  </span>
                </li>
              )}
            </ul>
            {socials.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-navy-700 px-2.5 py-1 text-xs text-navy-200 hover:border-navy-500 hover:text-white"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-navy-800 pt-6">
          <p className="text-xs leading-relaxed text-navy-400">{company.investmentDisclaimer}</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-navy-400">
              © {year} {company.legalName}. All rights reserved.
            </p>
            <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Legal">
              {LEGAL_NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-xs text-navy-400 hover:text-white">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
