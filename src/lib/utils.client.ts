/**
 * Small browser-safe helpers. Kept separate from src/lib/utils.ts so client
 * components never pull in server-only code.
 */

export interface PasswordStrength {
  ok: boolean;
  score: number;
  label: string;
}

const WEAK = ['password', '123456', '12345678', 'qwerty', 'letmein', 'admin', 'welcome', 'seedwel', 'zambia', 'abc123'];

/** Mirrors the server-side policy so users get instant feedback. */
export function checkPasswordStrength(password: string): PasswordStrength {
  const value = String(password || '');
  if (value.length < 8) return { ok: false, score: 0, label: 'Too short' };
  const lower = value.toLowerCase();
  if (WEAK.some((w) => lower.includes(w))) return { ok: false, score: 1, label: 'Too common' };
  let score = 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^\w\s]/.test(value)) score += 1;
  score = Math.min(4, score);
  return { ok: true, score, label: score >= 4 ? 'Strong' : score >= 3 ? 'Good' : 'Weak' };
}
