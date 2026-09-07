import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { verifyEmailWithToken } from '@/app/actions/auth';

export const metadata: Metadata = {
  title: 'Confirm your email address',
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailWithToken(token) : null;

  return (
    <AuthShell
      title={result?.ok ? 'Email confirmed' : 'Confirmation link'}
      subtitle={result?.message}
      footer={
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Continue to sign in →
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        {result?.ok ? (
          <CheckCircle2 size={44} className="text-emerald-500" aria-hidden />
        ) : (
          <XCircle size={44} className="text-brand-500" aria-hidden />
        )}
        <p className="max-w-sm text-sm leading-relaxed text-navy-600">
          {result?.ok
            ? 'Your email address is now verified on your Seedwel Workplace account.'
            : 'Open the confirmation link from your email, or request a new one from your dashboard.'}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
          >
            Go to dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50"
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
