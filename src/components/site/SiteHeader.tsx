'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ChevronDown, Phone, Mail, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PUBLIC_NAV, MORE_NAV } from '@/lib/nav';

export interface HeaderContact {
  email: string;
  phone: string;
  tagline: string;
}

export default function SiteHeader({ contact }: { contact: HeaderContact }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-50">
      {/* Utility strip */}
      <div className="hidden border-b border-navy-800/60 bg-navy-900 text-navy-200 lg:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="truncate">{contact.tagline}</p>
          <div className="flex items-center gap-5">
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Phone size={13} aria-hidden /> {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Mail size={13} aria-hidden /> {contact.email}
              </a>
            )}
            <Link href="/login" className="font-medium text-white/80 hover:text-white">
              Workplace login
            </Link>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'border-b bg-white/95 backdrop-blur transition-shadow',
          scrolled ? 'shadow-nav border-navy-100' : 'border-transparent',
        )}
      >
        <div className="container-page flex h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Seedwel Investment Limited — home">
            <Image
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-xl"
            />
            <span className="hidden leading-tight sm:block">
              <span className="block text-[0.95rem] font-semibold tracking-tight text-navy-900">Seedwel Investment</span>
              <span className="block text-[0.7rem] uppercase tracking-[0.18em] text-navy-500">Limited · Zambia</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-[0.9rem] font-medium transition-colors',
                  isActive(item.href) ? 'bg-navy-50 text-navy-900' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900',
                )}
              >
                {item.label}
              </Link>
            ))}

            <div className="relative" onMouseLeave={() => setMoreOpen(false)}>
              <button
                type="button"
                onMouseEnter={() => setMoreOpen(true)}
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-[0.9rem] font-medium text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy-900"
              >
                More
                <ChevronDown size={15} className={cn('transition-transform', moreOpen && 'rotate-180')} aria-hidden />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full w-64 pt-2">
                  <div className="overflow-hidden rounded-xl border border-navy-100 bg-white p-1.5 shadow-lift">
                    {MORE_NAV.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-lg px-3 py-2 transition-colors hover:bg-navy-50"
                      >
                        <span className="block text-sm font-medium text-navy-900">{item.label}</span>
                        {item.description && <span className="block text-xs text-navy-500">{item.description}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/request-a-service"
              className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 md:inline-flex"
            >
              Request a Service
              <ArrowRight size={15} aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-navy-200 text-navy-800 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
              <span className="flex items-center gap-2">
                <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
                <span className="text-sm font-semibold text-navy-900">Seedwel</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-navy-200 text-navy-800"
                aria-label="Close menu"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {[...PUBLIC_NAV, ...MORE_NAV].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex min-h-[48px] items-center rounded-xl px-3 text-[0.95rem] font-medium transition-colors',
                    isActive(item.href) ? 'bg-navy-50 text-navy-900' : 'text-navy-700 hover:bg-navy-50',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="space-y-2 border-t border-navy-100 p-4">
              <Link
                href="/request-a-service"
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white"
              >
                Request a Service
              </Link>
              <Link
                href="/login"
                className="flex min-h-[48px] items-center justify-center rounded-xl border border-navy-200 px-4 text-sm font-medium text-navy-900"
              >
                Workplace Login
              </Link>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone.replace(/\s/g, '')}`}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 text-sm text-navy-600"
                >
                  <Phone size={15} aria-hidden /> {contact.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
