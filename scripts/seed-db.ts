/**
 * Creates the SQLite database (if needed) and seeds it. Safe to re-run:
 * seeding only happens when the database has never been initialised.
 *
 *   npx tsx scripts/seed-db.ts
 */
import { getDb } from '../src/lib/db';

const db = getDb();
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as Array<{ name: string }>;

console.log(`Database ready at ${process.env.DATABASE_PATH || './data/seedwel.db'}`);
console.log(`${tables.length} tables:`);
for (const t of tables) {
  const count = (db.prepare(`SELECT COUNT(*) AS c FROM ${t.name}`).get() as { c: number }).c;
  console.log(`  - ${t.name.padEnd(22)} ${count} rows`);
}
