import crypto from 'node:crypto';

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/**
 * Password hashing with scrypt (memory-hard, no third-party dependency).
 * Stored format: scrypt$N$r$p$salt$hash
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS).toString('hex');
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !password) return false;
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  try {
    const derived = crypto.scryptSync(password, salt, hash.length / 2, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    const a = Buffer.from(derived.toString('hex'), 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const WEAK = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'letmein',
  'admin',
  'welcome',
  'seedwel',
  'zambia',
  'abc123',
];

export interface PasswordCheck {
  ok: boolean;
  score: number;
  message?: string;
}

/** Practical password policy: length plus a light common-password check. */
export function checkPasswordStrength(password: string): PasswordCheck {
  const value = String(password || '');
  if (value.length < 8) return { ok: false, score: 0, message: 'Use at least 8 characters.' };
  if (value.length > 128) return { ok: false, score: 0, message: 'Password is too long.' };
  const lower = value.toLowerCase();
  if (WEAK.some((w) => lower === w || lower.includes(w))) {
    return { ok: false, score: 1, message: 'This password is too common. Choose something less predictable.' };
  }
  let score = 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^\w\s]/.test(value)) score += 1;
  return { ok: true, score: Math.min(4, score) };
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
