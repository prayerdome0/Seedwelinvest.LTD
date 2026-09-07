import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy-900 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-brand-600/25 blur-3xl" />

        <div className="relative p-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5">
              <Image src="/logo.png" alt="" width={40} height={40} className="h-full w-full" />
            </span>
            <span className="text-sm font-semibold">Seedwel Investment Limited</span>
          </Link>
        </div>

        <div className="relative px-10 pb-12">
          <h2 className="max-w-md text-[1.9rem] font-semibold leading-tight tracking-[-0.02em]">
            Seedwel Workplace
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-navy-200">
            One secure login for our staff, clients and applicants. Tasks, projects, recruitment, documents and
            reporting — in the place where the work actually happens.
          </p>
          <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6 text-xs">
            {[
              { label: 'Tasks', value: 'Assign, submit, approve' },
              { label: 'Recruitment', value: 'Applications to onboarding' },
              { label: 'Clients', value: 'Requests and delivery' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="font-semibold text-white">{item.label}</dt>
                <dd className="mt-1 text-navy-300">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative px-10 pb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-navy-300 hover:text-white">
            <ArrowLeft size={13} aria-hidden /> Back to the website
          </Link>
        </div>
      </aside>

      <main className="flex items-center justify-center bg-mist px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
            <span className="text-sm font-semibold text-navy-900">Seedwel Investment Limited</span>
          </Link>

          <div className="card p-6 sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight text-navy-900 sm:text-2xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-navy-600">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>

          {footer && <div className="mt-5 text-center text-sm text-navy-600">{footer}</div>}

          <p className="mt-6 text-center text-xs text-navy-500 lg:hidden">
            <Link href="/" className="hover:text-navy-800">
              ← Back to the website
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
