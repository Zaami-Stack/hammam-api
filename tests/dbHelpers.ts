import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { getMigrationConnection, getPool } from '../src/db/pool';
import { run as runMigrations } from '../src/db/migrate';
import { SEEDS_DIR } from './setup';

export async function resetDb(): Promise<void> {
  const pool = getPool();
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query(
    'DROP TABLE IF EXISTS audit_logs, entries, prices, categories, hammams, users, schema_migrations'
  );
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  await runMigrations();

  const conn = await getMigrationConnection();
  try {
    const seedFiles = readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const file of seedFiles) {
      await conn.query(readFileSync(path.join(SEEDS_DIR, file), 'utf8'));
    }
  } finally {
    await conn.end();
  }

  await createUser('Administrator', 'admin@hammam.ma', 'Admin@123', 'ADMIN');
  await createUser('Fatima', 'fatima@hammam.ma', 'Reception@123', 'RECEPTION');
  await createUser('Amina', 'amina@hammam.ma', 'Reception@123', 'RECEPTION');
}

async function createUser(
  name: string,
  email: string,
  password: string,
  role: 'ADMIN' | 'RECEPTION'
): Promise<number> {
  const hash = await bcrypt.hash(password, 4);
  const [result] = await getPool().query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, role]
  );
  return result.insertId;
}