import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-4">
      <div className="w-full max-w-lg text-center">
        <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-brand-600">Error 404</p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.02em] text-navy-900 sm:text-[2.5rem]">
          This page could not be found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-navy-600">
          The page may have been moved or unpublished. Try one of these instead.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="primary" size="lg">
            Back to home
          </ButtonLink>
          <ButtonLink href="/services" variant="outline" size="lg">
            Our services
          </ButtonLink>
          <ButtonLink href="/contact" variant="ghost" size="lg">
            Contact us
          </ButtonLink>
        </div>
        <nav className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-navy-500" aria-label="Popular pages">
          <Link href="/about" className="hover:text-navy-900">About</Link>
          <Link href="/careers" className="hover:text-navy-900">Careers</Link>
          <Link href="/opportunities" className="hover:text-navy-900">Opportunities</Link>
          <Link href="/projects" className="hover:text-navy-900">Projects</Link>
          <Link href="/education" className="hover:text-navy-900">Education &amp; Skills</Link>
        </nav>
      </div>
    </main>
  );
}
