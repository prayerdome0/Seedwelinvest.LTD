/**
 * Deletes the SQLite database (including all uploads stored in data/) and
 * rebuilds it from the seed. Use for local development only.
 *
 *   npx tsx scripts/reset-db.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const target = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data', 'seedwel.db');
const dataDir = path.dirname(target);

for (const suffix of ['', '-wal', '-shm']) {
  const file = `${target}${suffix}`;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`removed ${path.relative(process.cwd(), file)}`);
  }
}

const uploads = path.join(dataDir, 'uploads');
if (fs.existsSync(uploads)) {
  fs.rmSync(uploads, { recursive: true, force: true });
  console.log(`removed ${path.relative(process.cwd(), uploads)}`);
}

// Rebuild
const { getDb } = await import('../src/lib/db');
getDb();
console.log('database recreated and seeded');
