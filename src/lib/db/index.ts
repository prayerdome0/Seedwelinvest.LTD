import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';
import { seedDatabase } from './seed';
import { slugify } from '../utils';

export type Row = Record<string, any>;

/**
 * Root directory that holds writable runtime state (the SQLite database and
 * private uploads).
 *
 * Serverless platforms such as Vercel, AWS Lambda and Netlify mount the project
 * directory read-only and only guarantee writes inside the OS temp directory.
 * We detect that up front and relocate state there, so the application boots
 * instead of throwing EROFS the first time it touches the database.
 *
 * On a normal server or local machine the project directory is used, keeping
 * the database at ./data/seedwel.db as documented.
 */
function stateRoot(): string {
  if (process.env.SEEDWEL_STATE_DIR) {
    return path.resolve(process.cwd(), process.env.SEEDWEL_STATE_DIR);
  }

  const cwd = process.cwd();
  const serverless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY,
  );

  if (!serverless) {
    try {
      fs.accessSync(cwd, fs.constants.W_OK);
      return cwd;
    } catch {
      /* read-only project directory: fall back to the temp directory */
    }
  }

  return path.join(os.tmpdir(), 'seedwel');
}

const STATE_ROOT = stateRoot();

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(STATE_ROOT, process.env.DATABASE_PATH)
  : path.join(STATE_ROOT, 'data', 'seedwel.db');

const PRIVATE_UPLOAD_DIR = process.env.PRIVATE_UPLOAD_DIR
  ? path.resolve(STATE_ROOT, process.env.PRIVATE_UPLOAD_DIR)
  : path.join(STATE_ROOT, 'data', 'uploads');

/** Public uploads are static assets served from Next's `public` directory. */
export const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

let dbInstance: Database.Database | null = null;

/**
 * Creates a directory when the filesystem allows it. `public/uploads` lives
 * inside the deployed bundle on serverless platforms, where it is read-only;
 * the directory already ships with the build, so failing is not fatal there.
 */
function ensureDir(dir: string, required: boolean): void {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    if (required) throw error;
  }
}

function create(): Database.Database {
  ensureDir(path.dirname(DB_PATH), true);
  ensureDir(PRIVATE_UPLOAD_DIR, true);
  ensureDir(PUBLIC_UPLOAD_DIR, false);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA_SQL);

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM settings').get() as { count: number };
  if (count === 0) {
    seedDatabase(db);
  }
  return db;
}

/**
 * Returns the process-wide SQLite connection, creating and seeding it on first use.
 * Cached on globalThis so the Next.js dev server does not open a new handle on
 * every hot reload.
 */
export function getDb(): Database.Database {
  const g = globalThis as unknown as { __seedwelDb?: Database.Database };
  if (g.__seedwelDb) return g.__seedwelDb;
  if (!dbInstance) dbInstance = create();
  g.__seedwelDb = dbInstance;
  return dbInstance;
}

export function queryAll<T = Row>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(...(params as any[])) as T[];
}

export function queryOne<T = Row>(sql: string, params: unknown[] = []): T | undefined {
  return getDb().prepare(sql).get(...(params as any[])) as T | undefined;
}

export function execute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number | bigint } {
  const info = getDb().prepare(sql).run(...(params as any[]));
  return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
}

export function transaction<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}

export function count(sql: string, params: unknown[] = []): number {
  const row = getDb().prepare(sql).get(...(params as any[])) as { c: number } | undefined;
  return row ? Number(row.c) : 0;
}

/** Turn a "1,2,3" string into a bound-safe list for `IN (...)` clauses. */
export function inPlaceholders(values: (number | string)[]): string {
  return values.map(() => '?').join(',');
}

export { PRIVATE_UPLOAD_DIR, DB_PATH };

/* ------------------------------------------------------------------ helpers */

export function uniqueSlug(table: string, value: string, excludeId?: number): string {
  const base = slugify(value) || `item-${Date.now()}`;
  let candidate = base;
  let i = 2;
  for (;;) {
    const row = excludeId
      ? queryOne<{ id: number }>(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`, [candidate, excludeId])
      : queryOne<{ id: number }>(`SELECT id FROM ${table} WHERE slug = ?`, [candidate]);
    if (!row) return candidate;
    candidate = `${base}-${i++}`;
  }
}

export { nowIso, slugify, lines, toLines } from '../utils';
