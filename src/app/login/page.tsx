import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { getUser } from '@/lib/auth/session';
import { getSetting } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Workplace Login',
  description: 'Sign in to Seedwel Workplace — tasks, projects, recruitment and client delivery.',
  robots: { index: false, follow: true },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getUser();
  if (user) redirect(next && next.startsWith('/') ? next : '/dashboard');

  const allowRegistration = getSetting('allow_public_registration', '1') !== '0';

  return (
    <AuthShell
      title="Sign in to Seedwel Workplace"
      subtitle="Use the account created for you by Seedwel, or the one you registered as a client or applicant."
      footer={
        allowRegistration ? (
          <span>
            Need an account?{' '}
            <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Create one
            </Link>
          </span>
        ) : (
          <span>Accounts are created by our team. Contact us if you need access.</span>
        )
      }
    >
      <LoginForm next={next} />
      <div className="mt-6 rounded-xl border border-navy-100 bg-navy-50/60 p-4">
        <p className="text-xs leading-relaxed text-navy-600">
          <strong className="font-semibold text-navy-800">Demonstration accounts.</strong> This deployment ships with
          seeded demo users. Sign in as{' '}
          <code className="rounded bg-white px-1 py-0.5 text-[0.7rem]">admin@seedwelinvest.example</code> with the
          password set in <code className="rounded bg-white px-1 py-0.5 text-[0.7rem]">ADMIN_PASSWORD</code> (see
          .env.example), or use any seeded workplace account with the demo password{' '}
          <code className="rounded bg-white px-1 py-0.5 text-[0.7rem]">Seedwel@2026</code>.
        </p>
      </div>
    </AuthShell>
  );
}
