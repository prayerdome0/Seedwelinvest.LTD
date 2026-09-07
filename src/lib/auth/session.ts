import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { getDb, queryAll, queryOne, execute } from '@/lib/db';
import { verifyPassword, randomToken, sha256 } from './password';

export const SESSION_COOKIE = 'sw_session';
const SESSION_DAYS = 14;

export interface SessionUser {
  id: number;
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roleKey: string;
  roleName: string;
  status: string;
  departmentId: number | null;
  departmentName: string | null;
  jobTitle: string;
  avatarPath: string | null;
  phone: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  managerId: number | null;
  permissions: string[];
  lastLoginAt: string | null;
}

export interface AuthContext {
  user: SessionUser | null;
  permissions: Set<string>;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') || '0.0.0.0';
}

export async function userAgent(): Promise<string> {
  const h = await headers();
  return (h.get('user-agent') || '').slice(0, 300);
}

/** Loads the signed-in user (and their effective permissions) once per request. */
export const getAuth = cache(async (): Promise<AuthContext> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return { user: null, permissions: new Set() };

  const row = queryOne<{ user_id: number; expires_at: string; revoked_at: string | null }>(
    'SELECT user_id, expires_at, revoked_at FROM sessions WHERE token_hash = ?',
    [sha256(token)],
  );
  if (!row || row.revoked_at) return { user: null, permissions: new Set() };
  if (new Date(row.expires_at.replace(' ', 'T') + 'Z').getTime() < Date.now()) {
    return { user: null, permissions: new Set() };
  }

  const user = loadUser(row.user_id);
  if (!user || user.status !== 'active') return { user: null, permissions: new Set() };
  return { user, permissions: new Set(user.permissions) };
});

export const getUser = cache(async (): Promise<SessionUser | null> => (await getAuth()).user);

/** Effective permissions = permissions of the primary role ∪ additional roles. */
export function permissionsFor(userId: number): string[] {
  const rows = queryAll<{ permission: string }>(
    `SELECT DISTINCT rp.permission AS permission
       FROM role_permissions rp
      WHERE rp.role_key = (SELECT role_key FROM users WHERE id = ?)
         OR rp.role_key IN (SELECT role_key FROM user_roles WHERE user_id = ?)`,
    [userId, userId],
  );
  return rows.map((r) => r.permission);
}

function loadUser(id: number): SessionUser | null {
  const row = queryOne<any>(
    `SELECT u.*, r.name AS role_name, d.name AS department_name
       FROM users u
       LEFT JOIN roles r ON r.key = u.role_key
       LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id = ?`,
    [id],
  );
  if (!row) return null;
  return {
    id: row.id,
    uuid: row.uuid,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim() || row.email,
    roleKey: row.role_key,
    roleName: row.role_name || row.role_key,
    status: row.status,
    departmentId: row.department_id,
    departmentName: row.department_name || null,
    jobTitle: row.job_title,
    avatarPath: row.avatar_path,
    phone: row.phone,
    phoneVerified: !!row.phone,
    emailVerified: !!row.email_verified_at,
    managerId: row.manager_id,
    permissions: permissionsFor(row.id),
    lastLoginAt: row.last_login_at,
  };
}

export async function createSession(userId: number): Promise<string> {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  execute('INSERT INTO sessions (id, user_id, token_hash, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)', [
    randomToken(12),
    userId,
    sha256(token),
    await clientIp(),
    await userAgent(),
    expires,
  ]);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
  execute("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [userId]);
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    execute("UPDATE sessions SET revoked_at = datetime('now') WHERE token_hash = ?", [sha256(token)]);
  }
  store.delete(SESSION_COOKIE);
}

/** Removes every session belonging to a user (used after password reset / disable). */
export function revokeAllSessions(userId: number): void {
  execute("UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL", [userId]);
}

/* ------------------------------------------------------------- rate limiting */

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

export function tooManyAttempts(identifier: string): boolean {
  const row = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM auth_attempts WHERE identifier = ? AND success = 0 AND created_at > datetime('now', ?)",
    [identifier, `-${WINDOW_MINUTES} minutes`],
  );
  return (row?.c ?? 0) >= MAX_ATTEMPTS;
}

export function recordAttempt(identifier: string, ip: string, success: boolean): void {
  execute('INSERT INTO auth_attempts (identifier, ip, success) VALUES (?, ?, ?)', [identifier, ip, success ? 1 : 0]);
  if (success) {
    execute("DELETE FROM auth_attempts WHERE identifier = ? AND created_at < datetime('now', '-1 day')", [identifier]);
  }
}

export function clearAttempts(identifier: string): void {
  execute('DELETE FROM auth_attempts WHERE identifier = ?', [identifier]);
}

/* ------------------------------------------------------------------ sign in */

export interface LoginResult {
  ok: boolean;
  error?: string;
  user?: SessionUser;
}

export async function signIn(email: string, password: string): Promise<LoginResult> {
  const ip = await clientIp();
  const key = email.trim().toLowerCase();
  if (!key || !password) return { ok: false, error: 'Enter your email address and password.' };
  if (tooManyAttempts(key)) {
    return { ok: false, error: `Too many attempts. Please wait ${WINDOW_MINUTES} minutes and try again.` };
  }

  const row = queryOne<any>('SELECT * FROM users WHERE email = ?', [key]);
  if (!row || !verifyPassword(password, row.password_hash)) {
    recordAttempt(key, ip, false);
    return { ok: false, error: 'Those details do not match an account.' };
  }
  if (row.status === 'disabled') {
    return { ok: false, error: 'This account has been disabled. Please contact the administrator.' };
  }
  if (row.status === 'invited') {
    return { ok: false, error: 'This account has not finished registration. Use the invitation link we sent you.' };
  }

  recordAttempt(key, ip, true);
  clearAttempts(key);
  await createSession(row.id);
  const user = loadUser(row.id);
  return { ok: true, user: user ?? undefined };
}

/** Lightweight helper used by tests and scripts. */
export function db(): ReturnType<typeof getDb> {
  return getDb();
}
