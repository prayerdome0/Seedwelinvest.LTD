'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Errors are surfaced in the server log; this hook keeps the client quiet
    // in production while still helping during development.
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-4">
      <div className="w-full max-w-lg text-center">
        <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-brand-600">Something went wrong</p>
        <h1 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.02em] text-navy-900 sm:text-[2.2rem]">
          We could not load this page
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-navy-600">
          Please try again. If the problem continues, contact us and we will look into it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} size="lg">
            Try again
          </Button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-navy-200 bg-white px-6 py-3 text-base font-medium text-navy-900 hover:bg-navy-50"
          >
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
