'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, ChevronRight, LogOut, Menu, Search, Settings, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DASHBOARD_NAV, type DashboardGroup } from '@/lib/nav';

export interface DashUser {
  fullName: string;
  email: string;
  roleName: string;
  avatarPath: string | null;
  permissions: string[];
}

export default function DashboardShell({
  user,
  groups,
  unread,
  children,
  banner,
}: {
  user: DashUser;
  groups: DashboardGroup[];
  unread: number;
  children: React.ReactNode;
  banner?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) => (href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href));

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Dashboard">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-2xs font-semibold uppercase tracking-[0.14em] text-navy-400">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                      active ? 'bg-navy-900 font-medium text-white' : 'text-navy-300 hover:bg-navy-800 hover:text-white',
                    )}
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.href === '/dashboard/notifications' && unread > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-2xs font-semibold text-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-mist">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-navy-900 lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-navy-800 px-4">
          <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Seedwel Workplace</p>
            <p className="truncate text-2xs text-navy-400">{user.roleName}</p>
          </div>
        </div>
        {nav}
        <div className="border-t border-navy-800 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-navy-300 transition-colors hover:bg-navy-800 hover:text-white"
          >
            <ChevronRight size={15} aria-hidden /> View website
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-navy-900">
            <div className="flex h-16 items-center justify-between border-b border-navy-800 px-4">
              <span className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="" width={30} height={30} className="h-7 w-7 rounded-lg" />
                <span className="text-sm font-semibold text-white">Seedwel Workplace</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-navy-700 text-navy-200"
                aria-label="Close menu"
              >
                <X size={17} aria-hidden />
              </button>
            </div>
            {nav}
            <div className="border-t border-navy-800 p-3">
              <Link href="/" className="block rounded-xl px-3 py-2 text-sm text-navy-300 hover:bg-navy-800">
                View website
              </Link>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-navy-200 text-navy-800 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} aria-hidden />
            </button>

            <div className="relative hidden max-w-sm flex-1 md:block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" aria-hidden />
              <input
                type="search"
                placeholder="Search people, tasks, projects…"
                className="w-full rounded-xl border border-navy-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-navy-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Link
                href="/dashboard/notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-navy-200 text-navy-700 hover:bg-navy-50"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
              >
                <Bell size={17} aria-hidden />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[0.6rem] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-navy-200 text-navy-700 hover:bg-navy-50"
                aria-label="Settings"
              >
                <Settings size={17} aria-hidden />
              </Link>

              <div className="ml-1 flex items-center gap-2.5 rounded-xl border border-navy-200 py-1 pl-1 pr-3">
                {user.avatarPath ? (
                  <Image src={user.avatarPath} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-xs font-semibold text-white">
                    {user.fullName
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                )}
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-xs font-semibold text-navy-900">{user.fullName}</span>
                  <span className="block truncate text-2xs text-navy-500">{user.roleName}</span>
                </span>
              </div>

              <form action="/api/auth/logout" method="post" className="hidden sm:block">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-navy-600 hover:bg-navy-50 hover:text-navy-900"
                >
                  <LogOut size={16} aria-hidden /> Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        {banner}

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

        <footer className="border-t border-navy-100 px-4 py-5 text-xs text-navy-500 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>Seedwel Investment Limited · Workplace</p>
            <nav className="flex flex-wrap gap-3">
              <Link href="/dashboard/documents" className="hover:text-navy-800">
                <User size={12} className="mr-1 inline" aria-hidden /> Documents
              </Link>
              <Link href="/" className="hover:text-navy-800">
                Website
              </Link>
              <Link href="/legal/privacy-policy" className="hover:text-navy-800">
                Privacy
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
