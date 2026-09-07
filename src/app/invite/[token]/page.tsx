import type { Metadata } from 'next';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import { AcceptInvitationForm } from '@/components/auth/AcceptInvitationForm';
import { loadInvitation } from '@/app/actions/auth';
import { roleLabel } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Accept your invitation',
  robots: { index: false, follow: false },
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await loadInvitation(token);

  if (!invitation) {
    return (
      <AuthShell
        title="Invitation not available"
        subtitle="This invitation link is invalid, has already been used, or has expired."
        footer={
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm leading-relaxed text-navy-600">
          Ask the administrator who invited you to issue a new invitation from the recruitment dashboard.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome to Seedwel"
      subtitle={`You have been invited to join as ${roleLabel(invitation.roleKey)}${
        invitation.jobTitle ? ` — ${invitation.jobTitle}` : ''
      }. Create your password to complete your registration.`}
      footer={<span className="text-xs">This invitation expires {formatDate(invitation.expiresAt)}</span>}
    >
      <AcceptInvitationForm
        token={token}
        defaults={{
          email: invitation.email,
          first_name: invitation.firstName,
          last_name: invitation.lastName,
        }}
      />
    </AuthShell>
  );
}

export const dynamic = 'force-dynamic';
