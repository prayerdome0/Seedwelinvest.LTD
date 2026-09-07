import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** SQLite stores UTC as "YYYY-MM-DD HH:MM:SS". Parse it deterministically. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(withZone);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const longDateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? dateFmt.format(d) : '—';
}

export function formatLongDate(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? longDateFmt.format(d) : '—';
}

export function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? `${dateTimeFmt.format(d)} UTC` : '—';
}

export function timeAgo(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Midnight today in UTC, as an SQLite-friendly string. Used for "My Day". */
export function todayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
  return { start: fmt(start), end: fmt(end) };
}

export function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function initials(first: string, last?: string): string {
  const a = (first || '').trim().charAt(0).toUpperCase();
  const b = (last || '').trim().charAt(0).toUpperCase();
  return `${a}${b}` || 'S';
}

export function lines(value: string | null | undefined): string[] {
  return (value || '')
    .split('\n')
    .map((l) => l.replace(/^[-•\s]+/, '').trim())
    .filter(Boolean);
}

export function toLines(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean).join('\n');
  return String(value ?? '');
}

export function truncate(value: string, max = 140): string {
  const v = (value || '').trim();
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
}

export function money(amount: number | null | undefined, currency = 'ZMW'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `${currency} ${Number(amount).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

export function reference(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${stamp}${rand}`;
}

export function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'on' || value === 'true';
}

/** Human readable file size, e.g. 1.4 MB. */
export function formatFileSize(bytes: number | null | undefined): string {
  const value = Number(bytes ?? 0);
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const size = value / 1024 ** index;
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}
