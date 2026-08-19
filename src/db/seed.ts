import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { getMigrationConnection } from './pool';
import { run as runMigrations } from './migrate';
import { logger } from '../utils/logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const SEEDS_DIR = path.resolve(__dirname, '../../../database/seeds');

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'RECEPTION';
}

const DEV_USERS: SeedUser[] = [
  { name: 'Administrator', email: 'admin@hammam.ma', password: 'Admin@123', role: 'ADMIN' },
  { name: 'Fatima', email: 'fatima@hammam.ma', password: 'Reception@123', role: 'RECEPTION' },
  { name: 'Amina', email: 'amina@hammam.ma', password: 'Reception@123', role: 'RECEPTION' },
];

function randomInt(min: number, max: number, rand: () => number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function casablancaDateOffset(daysAgo: number): Date {
  const now = Date.now();
  const map = new Date(now - daysAgo * 24 * 3600 * 1000);
  return new Date(map.getTime());
}

async function run(): Promise<void> {
  await runMigrations();

  const conn = await getMigrationConnection();
  try {
    const seeds = fs
      .readdirSync(SEEDS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of seeds) {
      logger.info(`Seeding: ${file}`);
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
      await conn.query(sql);
    }

    for (const user of DEV_USERS) {
      const hash = await bcrypt.hash(user.password, 10);
      const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)',
        [user.name, user.email, hash, user.role]
      );
      logger.info(
        result.insertId
          ? `Created dev user: ${user.email} (${user.role})`
          : `Dev user exists (kept password): ${user.email}`
      );
    }
  } finally {
    await conn.end();
  }

  if (process.argv.includes('--sample')) {
    await seedSampleEntries();
  }

  logger.info('Seed complete.');
  logger.info('Development credentials (for local testing only):');
  logger.info('  admin@hammam.ma   / Admin@123      (ADMIN)');
  logger.info('  fatima@hammam.ma  / Reception@123  (RECEPTION)');
  logger.info('  amina@hammam.ma   / Reception@123  (RECEPTION)');
}

async function seedSampleEntries(): Promise<void> {
  logger.info('Generating sample entrance history...');
  const conn = await getMigrationConnection();
  try {
    const [users] = await conn.query<RowDataPacket[] & { id: number }[]>(
      "SELECT id FROM users WHERE role = 'RECEPTION' ORDER BY id"
    );
    const [prices] = await conn.query<
      (RowDataPacket & { hammam_id: number; category_id: number; price: number })[]
    >('SELECT hammam_id, category_id, price FROM prices');
    const [maxRows] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM entries');
    if (Number(maxRows[0].total) > 0) {
      logger.warn('Sample entries skipped: entries table is not empty.');
      return;
    }

    const rand = mulberry32(20260819);
    const userIds = users.map((u) => u.id);
    const rows: unknown[][] = [];

    for (let daysAgo = 119; daysAgo >= 0; daysAgo -= 1) {
      const dayDate = casablancaDateOffset(daysAgo);
      const local = new Date(dayDate.getTime() + 60 * 60 * 1000);
      const datePart = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`;

      const hourOfDay = (h: number) =>
        `${datePart} ${String(h).padStart(2, '0')}:${String(randomInt(0, 59, rand)).padStart(2, '0')}:00`;

      const perCombo = [randomInt(6, 40, rand), randomInt(2, 15, rand), randomInt(4, 45, rand), randomInt(2, 18, rand)];

      for (let c = 0; c < 4; c += 1) {
        const p = prices[c];
        if (!p) continue;
        const count = perCombo[c];
        for (let i = 0; i < count; i += 1) {
          const hour = daysAgo === 0 ? randomInt(7, new Date().getUTCHours() + 1, rand) : randomInt(7, 22, rand);
          rows.push([p.hammam_id, p.category_id, p.price, userIds[randomInt(0, userIds.length - 1, rand)], hourOfDay(Math.max(7, Math.min(hour, 22)))]);
        }
      }
    }

    logger.info(`Inserting ${rows.length} sample entries...`);
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
      await conn.query(
        `INSERT INTO entries (hammam_id, category_id, price, user_id, created_at) VALUES ${placeholders}`,
        chunk.flat()
      );
    }
    logger.info(`Inserted ${rows.length} sample entries.`);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Seed failed', err);
      process.exit(1);
    });
}

export { run, DEV_USERS };