import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { updateSettings } from '@/lib/settings';
import { AuthorizationError } from '@/lib/auth/guards';

export async function POST(request: Request) {
  let user;
  try {
    user = await requirePermission('settings.manage');
  } catch (error) {
    const origin = new URL(request.url).origin;
    if (error instanceof AuthorizationError) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=forbidden', origin), { status: 303 });
    }
    return NextResponse.redirect(new URL('/login', origin), { status: 303 });
  }

  const form = await request.formData();
  const patch: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof key === 'string' && key.startsWith('setting:')) {
      patch[key.slice('setting:'.length)] = String(value ?? '');
    }
  }

  if (Object.keys(patch).length) {
    updateSettings(patch, { id: user.id, fullName: user.fullName });
  }

  return NextResponse.redirect(new URL('/dashboard/settings?saved=1', new URL(request.url).origin), { status: 303 });
}
