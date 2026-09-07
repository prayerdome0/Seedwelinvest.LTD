'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { execute, queryOne } from '@/lib/db';
import { checkPasswordStrength, hashPassword, randomToken, sha256, verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession, recordAttempt, tooManyAttempts, clientIp, userAgent, revokeAllSessions } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { sendMail, siteUrl } from '@/lib/mailer';
import { logAudit } from '@/lib/audit';
import { notify } from '@/lib/notifications';
import { landingPathFor } from '@/lib/rbac';
import { stringValue, zodToErrors, type ActionState } from '@/lib/forms';
import { getSetting } from '@/lib/settings';
import { permissionsFor } from '@/lib/auth/session';

/* --------------------------------------------------------------- token utils */

const TOKEN_TTL_HOURS: Record<string, number> = {
  verify_email: 48,
  reset_password: 2,
  invitation: 24 * 14,
};

export async function issueToken(
  type: 'verify_email' | 'reset_password' | 'invitation',
  userId: number | null,
  email: string,
  meta: Record<string, unknown> = {},
): Promise<string> {
  const token = randomToken(32);
  const hours = TOKEN_TTL_HOURS[type] ?? 24;
  execute(
    `INSERT INTO auth_tokens (id, user_id, type, token_hash, email, meta, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))`,
    [randomToken(12), userId, type, sha256(token), email.toLowerCase(), JSON.stringify(meta), `+${hours} hours`],
  );
  return token;
}

async function consumeToken(token: string, type: string) {
  const row = queryOne<{ id: string; user_id: number | null; email: string; meta: string; expires_at: string; used_at: string | null }>(
    'SELECT * FROM auth_tokens WHERE token_hash = ? AND type = ?',
    [sha256(token), type],
  );
  if (!row || row.used_at) return null;
  if (new Date(`${row.expires_at.replace(' ', 'T')}Z`).getTime() < Date.now()) return null;
  return row;
}

/* --------------------------------------------------------------- validation */

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

const registerSchema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name').max(80),
  last_name: z.string().trim().min(1, 'Enter your last name').max(80),
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  phone: z.string().trim().max(40).optional(),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirm_password: z.string(),
  account_type: z.enum(['client', 'applicant']),
  company: z.string().trim().max(160).optional(),
  consent: z.string().optional(),
});

/* -------------------------------------------------------------------- login */

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: stringValue(form, 'email'),
    password: String(form.get('password') ?? ''),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error), values: { email: stringValue(form, 'email') } };
  }

  const ip = await clientIp();
  const limited = rateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
  if (!limited.ok) {
    return { ok: false, message: 'Too many attempts from this connection. Please try again shortly.' };
  }

  const email = parsed.data.email.toLowerCase();
  if (tooManyAttempts(email)) {
    return { ok: false, message: 'Too many failed attempts for this account. Please wait 15 minutes or reset your password.' };
  }

  const row = queryOne<{ id: number; password_hash: string | null; status: string; role_key: string }>(
    'SELECT id, password_hash, status, role_key FROM users WHERE email = ?',
    [email],
  );

  if (!row || !row.password_hash || !verifyPassword(parsed.data.password, row.password_hash)) {
    recordAttempt(email, ip, false);
    return { ok: false, message: 'Those details do not match an account.', values: { email } };
  }
  if (row.status === 'disabled') {
    return { ok: false, message: 'This account has been disabled. Please contact the administrator.', values: { email } };
  }
  if (row.status === 'invited') {
    return { ok: false, message: 'This account has not completed registration. Use the invitation link we emailed you.', values: { email } };
  }

  recordAttempt(email, ip, true);
  await createSession(row.id);
  await logAudit({ actorId: row.id, actorName: email, action: 'auth.login', entityType: 'user', entityId: row.id });

  const permissions = new Set(permissionsFor(row.id));
  const next = stringValue(form, 'next');
  const destination = next && next.startsWith('/') ? next : landingPathFor(permissions, row.role_key);
  redirect(destination);
}

/* ----------------------------------------------------------------- register */

export async function registerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (getSetting('allow_public_registration', '1') === '0') {
    return { ok: false, message: 'New registrations are closed. Please contact us to request an account.' };
  }

  const ip = await clientIp();
  const limited = rateLimit(`register:${ip}`, 5, 30 * 60 * 1000);
  if (!limited.ok) return { ok: false, message: 'Too many attempts from this connection. Please try again later.' };

  const parsed = registerSchema.safeParse({
    first_name: stringValue(form, 'first_name'),
    last_name: stringValue(form, 'last_name'),
    email: stringValue(form, 'email'),
    phone: stringValue(form, 'phone'),
    password: String(form.get('password') ?? ''),
    confirm_password: String(form.get('confirm_password') ?? ''),
    account_type: stringValue(form, 'account_type') || 'client',
    company: stringValue(form, 'company'),
    consent: stringValue(form, 'consent'),
  });

  const values = Object.fromEntries(
    ['first_name', 'last_name', 'email', 'phone', 'company', 'account_type'].map((k) => [k, stringValue(form, k)]),
  );

  if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error), values };
  if (parsed.data.password !== parsed.data.confirm_password) {
    return { ok: false, message: 'The passwords do not match.', errors: { confirm_password: 'Passwords do not match' }, values };
  }
  const strength = checkPasswordStrength(parsed.data.password);
  if (!strength.ok) {
    const reason = strength.message || 'Choose a stronger password.';
    return { ok: false, message: reason, errors: { password: reason }, values };
  }
  if (!parsed.data.consent) {
    return { ok: false, message: 'Please accept the privacy notice to continue.', errors: { consent: 'Accept the privacy notice' }, values };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = queryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return { ok: false, message: 'An account already exists for this email address. Try signing in or resetting your password.', errors: { email: 'Already registered' }, values };
  }

  const roleKey = parsed.data.account_type === 'applicant' ? 'applicant' : 'client';
  const info = execute(
    `INSERT INTO users (uuid, email, password_hash, first_name, last_name, phone, role_key, status, country, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'Zambia', datetime('now'), datetime('now'))`,
    [
      `usr_${randomToken(8)}`,
      email,
      hashPassword(parsed.data.password),
      parsed.data.first_name,
      parsed.data.last_name,
      parsed.data.phone || '',
      roleKey,
    ],
  );
  const userId = Number(info.lastInsertRowid);

  if (roleKey === 'client') {
    execute(
      `INSERT INTO clients (user_id, company_name, contact_name, email, phone, country, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'Zambia', 'prospect', datetime('now'))`,
      [userId, parsed.data.company || `${parsed.data.first_name} ${parsed.data.last_name}`, `${parsed.data.first_name} ${parsed.data.last_name}`, email, parsed.data.phone || ''],
    );
  }

  const token = await issueToken('verify_email', userId, email);
  const verifyUrl = `${siteUrl()}/verify-email?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Confirm your email address',
    body: `Welcome to Seedwel Workplace, ${parsed.data.first_name}.\n\nPlease confirm your email address by opening this link:\n${verifyUrl}\n\nIf you did not create this account, you can ignore this message.`,
  });

  await createSession(userId);
  await logAudit({ actorId: userId, actorName: email, action: 'auth.registered', entityType: 'user', entityId: userId, entityLabel: email });
  notify({
    userId,
    type: 'system',
    title: 'Welcome to Seedwel Workplace',
    body: 'Confirm your email address to secure your account.',
    href: '/dashboard',
  });

  redirect('/dashboard?welcome=1');
}

/* ---------------------------------------------------------- password reset */

export async function forgotPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = stringValue(form, 'email').toLowerCase();
  const ip = await clientIp();
  const limited = rateLimit(`forgot:${ip}`, 5, 30 * 60 * 1000);
  if (!limited.ok) return { ok: false, message: 'Too many requests. Please try again later.' };

  // Always respond the same way so the form cannot be used to discover accounts.
  const generic = { ok: true, message: 'If an account exists for that address, a reset link has been sent.' };
  if (!email) return { ok: false, message: 'Enter your email address.' };

  const user = queryOne<{ id: number; email: string; first_name: string }>('SELECT id, email, first_name FROM users WHERE email = ?', [email]);
  if (!user) return generic;

  const token = await issueToken('reset_password', user.id, user.email);
  await sendMail({
    to: user.email,
    subject: 'Reset your password',
    body: `Hello ${user.first_name},\n\nWe received a request to reset your Seedwel Workplace password. Open this link within 2 hours to choose a new password:\n${siteUrl()}/reset-password?token=${token}\n\nIf you did not request this, you can ignore this message — your password has not changed.`,
  });
  return { ...generic, reference: 'sent' };
}

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirm_password: z.string(),
});

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse({
    token: stringValue(form, 'token'),
    password: String(form.get('password') ?? ''),
    confirm_password: String(form.get('confirm_password') ?? ''),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error) };
  }
  if (parsed.data.password !== parsed.data.confirm_password) {
    return { ok: false, message: 'The passwords do not match.', errors: { confirm_password: 'Passwords do not match' } };
  }
  const strength = checkPasswordStrength(parsed.data.password);
  if (!strength.ok) {
    const reason = strength.message || 'Choose a stronger password.';
    return { ok: false, message: reason, errors: { password: reason } };
  }

  const token = await consumeToken(parsed.data.token, 'reset_password');
  if (!token || !token.user_id) {
    return { ok: false, message: 'This reset link is invalid or has expired. Please request a new one.' };
  }

  execute("UPDATE users SET password_hash = ?, status = CASE WHEN status = 'invited' THEN 'active' ELSE status END, updated_at = datetime('now') WHERE id = ?", [
    hashPassword(parsed.data.password),
    token.user_id,
  ]);
  execute("UPDATE auth_tokens SET used_at = datetime('now') WHERE id = ?", [token.id]);
  revokeAllSessions(token.user_id);
  await logAudit({ actorId: token.user_id, actorName: token.email, action: 'auth.password_reset', entityType: 'user', entityId: token.user_id });

  return { ok: true, message: 'Your password has been updated. You can sign in now.' };
}

/* -------------------------------------------------------- email verification */

export async function verifyEmailWithToken(token: string): Promise<{ ok: boolean; message: string }> {
  const record = await consumeToken(token, 'verify_email');
  if (!record || !record.user_id) {
    return { ok: false, message: 'This verification link is invalid or has expired.' };
  }
  execute("UPDATE users SET email_verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [record.user_id]);
  execute("UPDATE auth_tokens SET used_at = datetime('now') WHERE id = ?", [record.id]);
  await logAudit({
    actorId: record.user_id,
    actorName: record.email,
    action: 'auth.email_verified',
    entityType: 'user',
    entityId: record.user_id,
  });
  return { ok: true, message: 'Your email address has been confirmed. Thank you.' };
}

export async function resendVerificationAction(): Promise<ActionState> {
  const store = await cookies();
  const session = store.get('sw_session')?.value;
  if (!session) return { ok: false, message: 'Please sign in first.' };
  const row = queryOne<{ user_id: number }>('SELECT user_id FROM sessions WHERE token_hash = ? AND revoked_at IS NULL', [sha256(session)]);
  if (!row) return { ok: false, message: 'Please sign in first.' };

  const user = queryOne<{ id: number; email: string; first_name: string; email_verified_at: string | null }>(
    'SELECT id, email, first_name, email_verified_at FROM users WHERE id = ?',
    [row.user_id],
  );
  if (!user) return { ok: false, message: 'Please sign in first.' };
  if (user.email_verified_at) return { ok: true, message: 'Your email address is already confirmed.' };

  const ip = await clientIp();
  const limited = rateLimit(`verify:${user.id}`, 3, 15 * 60 * 1000);
  if (!limited.ok) return { ok: false, message: 'Please wait a few minutes before requesting another link.' };

  const token = await issueToken('verify_email', user.id, user.email);
  await sendMail({
    to: user.email,
    subject: 'Confirm your email address',
    body: `Hello ${user.first_name},\n\nOpen this link to confirm your email address:\n${siteUrl()}/verify-email?token=${token}`,
  });
  return { ok: true, message: 'A new confirmation link has been sent to your email address.' };
}

/* ---------------------------------------------------------------- invitation */

export interface InvitationContext {
  email: string;
  firstName: string;
  lastName: string;
  roleKey: string;
  jobTitle: string;
  departmentId: number | null;
  managerId: number | null;
  userId: number;
  expiresAt: string;
}

export async function loadInvitation(token: string): Promise<InvitationContext | null> {
  const record = await consumeToken(token, 'invitation');
  if (!record || !record.user_id) return null;
  const user = queryOne<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role_key: string;
    job_title: string;
    department_id: number | null;
    manager_id: number | null;
  }>('SELECT id, email, first_name, last_name, role_key, job_title, department_id, manager_id FROM users WHERE id = ?', [
    record.user_id,
  ]);
  if (!user) return null;
  return {
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    roleKey: user.role_key,
    jobTitle: user.job_title,
    departmentId: user.department_id,
    managerId: user.manager_id,
    userId: user.id,
    expiresAt: record.expires_at,
  };
}

const invitationSchema = z.object({
  token: z.string().min(10),
  first_name: z.string().trim().min(1, 'Enter your first name').max(80),
  last_name: z.string().trim().min(1, 'Enter your last name').max(80),
  phone: z.string().trim().min(6, 'Enter a contact number').max(40),
  location: z.string().trim().max(120).optional(),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirm_password: z.string(),
  emergency_name: z.string().trim().max(120).optional(),
  emergency_phone: z.string().trim().max(40).optional(),
});

export async function acceptInvitationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = invitationSchema.safeParse({
    token: stringValue(form, 'token'),
    first_name: stringValue(form, 'first_name'),
    last_name: stringValue(form, 'last_name'),
    phone: stringValue(form, 'phone'),
    location: stringValue(form, 'location'),
    password: String(form.get('password') ?? ''),
    confirm_password: String(form.get('confirm_password') ?? ''),
    emergency_name: stringValue(form, 'emergency_name'),
    emergency_phone: stringValue(form, 'emergency_phone'),
  });
  const values = Object.fromEntries(
    ['first_name', 'last_name', 'phone', 'location', 'emergency_name', 'emergency_phone'].map((k) => [k, stringValue(form, k)]),
  );
  if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error), values };
  if (parsed.data.password !== parsed.data.confirm_password) {
    return { ok: false, message: 'The passwords do not match.', errors: { confirm_password: 'Passwords do not match' }, values };
  }
  const strength = checkPasswordStrength(parsed.data.password);
  if (!strength.ok) {
    const reason = strength.message || 'Choose a stronger password.';
    return { ok: false, message: reason, errors: { password: reason }, values };
  }

  const context = await loadInvitation(parsed.data.token);
  if (!context) return { ok: false, message: 'This invitation is invalid or has expired. Please ask your administrator to send a new one.' };

  execute(
    `UPDATE users SET first_name = ?, last_name = ?, phone = ?, location = ?, emergency_name = ?, emergency_phone = ?,
      password_hash = ?, status = 'active', email_verified_at = COALESCE(email_verified_at, datetime('now')),
      joined_at = COALESCE(joined_at, datetime('now')), updated_at = datetime('now')
     WHERE id = ?`,
    [
      parsed.data.first_name,
      parsed.data.last_name,
      parsed.data.phone,
      parsed.data.location || '',
      parsed.data.emergency_name || '',
      parsed.data.emergency_phone || '',
      hashPassword(parsed.data.password),
      context.userId,
    ],
  );
  execute("UPDATE auth_tokens SET used_at = datetime('now') WHERE type = 'invitation' AND user_id = ? AND used_at IS NULL", [
    context.userId,
  ]);
  await logAudit({
    actorId: context.userId,
    actorName: context.email,
    action: 'onboarding.registration_completed',
    entityType: 'user',
    entityId: context.userId,
    entityLabel: context.email,
  });

  notify({
    userId: context.userId,
    type: 'invitation',
    title: 'Welcome to Seedwel',
    body: 'Your account is active. Start with My Day.',
    href: '/dashboard/my-day',
  });

  await createSession(context.userId);
  redirect('/dashboard/my-day?welcome=1');
}

/* ------------------------------------------------------------------- logout */

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}

/* ---------------------------------------------------------- change password */

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const store = await cookies();
  const token = store.get('sw_session')?.value;
  if (!token) return { ok: false, message: 'Please sign in again.' };
  const session = queryOne<{ user_id: number; expires_at: string }>(
    'SELECT user_id, expires_at FROM sessions WHERE token_hash = ? AND revoked_at IS NULL',
    [sha256(token)],
  );
  if (!session) return { ok: false, message: 'Please sign in again.' };

  const current = String(form.get('current_password') ?? '');
  const next = String(form.get('new_password') ?? '');
  const confirm = String(form.get('confirm_password') ?? '');

  const user = queryOne<{ id: number; password_hash: string | null }>('SELECT id, password_hash FROM users WHERE id = ?', [
    session.user_id,
  ]);
  if (!user || !verifyPassword(current, user.password_hash)) {
    return { ok: false, message: 'Your current password is incorrect.', errors: { current_password: 'Incorrect password' } };
  }
  if (next !== confirm) {
    return { ok: false, message: 'The new passwords do not match.', errors: { confirm_password: 'Passwords do not match' } };
  }
  const strength = checkPasswordStrength(next);
  if (!strength.ok) {
    const reason = strength.message || 'Choose a stronger password.';
    return { ok: false, message: reason, errors: { new_password: reason } };
  }

  execute("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [hashPassword(next), user.id]);
  await logAudit({
    actorId: user.id,
    actorName: 'Account owner',
    action: 'auth.password_changed',
    entityType: 'user',
    entityId: user.id,
  });

  return { ok: true, message: 'Your password has been changed.' };
}

export async function currentRequestInfo() {
  const h = await headers();
  return { userAgent: h.get('user-agent') ?? '' };
}

export { userAgent };
export type { ActionState };
