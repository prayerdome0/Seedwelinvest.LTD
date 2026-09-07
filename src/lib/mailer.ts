import 'server-only';
import { execute } from '@/lib/db';

export interface MailMessage {
  to: string;
  subject: string;
  body: string;
  meta?: Record<string, unknown>;
}

/**
 * Email delivery.
 *
 * In this build messages are stored in the database (`email_outbox`) and can be
 * read under Admin → Settings → Email outbox. That keeps verification links,
 * invitations and password resets fully testable without an SMTP provider, and
 * means no message is silently lost. To send real mail, swap the body of this
 * function for your provider (Resend, SES, Postmark, SMTP…).
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const from = `${process.env.MAIL_FROM_NAME || 'Seedwel Investment Limited'} <${
    process.env.MAIL_FROM_EMAIL || 'no-reply@seedwel.example'
  }>`;
  const body = `From: ${from}\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.body}`;

  execute('INSERT INTO email_outbox (to_email, subject, body, meta) VALUES (?, ?, ?, ?)', [
    message.to,
    message.subject,
    body,
    JSON.stringify(message.meta ?? {}),
  ]);

  if ((process.env.MAIL_DRIVER || 'outbox') === 'console') {
    console.log(`\n--- email ---\n${body}\n-------------\n`);
  }
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}
