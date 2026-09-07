import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { getUser } from '@/lib/auth/session';
import { getSetting } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a Seedwel Workplace account to follow service requests, projects or job applications.',
  robots: { index: false, follow: true },
};

export default async function RegisterPage() {
  const user = await getUser();
  if (user) redirect('/dashboard');

  if (getSetting('allow_public_registration', '1') === '0') {
    return (
      <AuthShell
        title="Registrations are closed"
        subtitle="New accounts are created by the Seedwel team. Please contact us to request access."
        footer={
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        }
      >
        <Link href="/contact" className="text-sm font-medium text-brand-600">
          Contact the team →
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Clients can follow requests and projects. Applicants can track their applications."
      footer={
        <span>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
