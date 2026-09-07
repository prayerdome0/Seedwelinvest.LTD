import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getAuth, getUser, type SessionUser } from './session';
import { landingPathFor, type PermissionKey } from '@/lib/rbac';

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission to do this.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export const requireUser = cache(async (nextPath?: string): Promise<SessionUser> => {
  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath || '/dashboard')}`);
  }
  return user as SessionUser;
});

/** Server Components: bounces to the workspace if the permission is missing. */
export async function requirePermission(permission: PermissionKey | string, nextPath?: string): Promise<SessionUser> {
  const { user, permissions } = await getAuth();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath || '/dashboard')}`);
  if (!permissions.has(permission) && !permissions.has('system.super')) {
    redirect('/dashboard?denied=1');
  }
  return user as SessionUser;
}

/**
 * Server Actions: throws instead of redirecting so the caller can return a
 * friendly error. Never trust any role information coming from the browser —
 * this always re-reads permissions from the database.
 */
export async function assertPermission(permission: PermissionKey | string): Promise<SessionUser> {
  const { user, permissions } = await getAuth();
  if (!user) throw new AuthorizationError('Please sign in to continue.');
  if (!permissions.has(permission) && !permissions.has('system.super')) {
    throw new AuthorizationError('You do not have permission to do this.');
  }
  return user;
}

export async function can(permission: PermissionKey | string): Promise<boolean> {
  const { permissions } = await getAuth();
  return permissions.has(permission) || permissions.has('system.super');
}

/** True when the user may act on another user's data (own vs any scoping). */
export function hasPermission(user: SessionUser | null, permission: PermissionKey | string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission) || user.permissions.includes('system.super');
}

export function whereUserLands(user: SessionUser): string {
  return landingPathFor(new Set(user.permissions), user.roleKey);
}
