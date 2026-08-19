import fs from 'fs';
import path from 'path';
import { getMigrationConnection } from './pool';
import { logger } from '../utils/logger';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');

async function ensureMigrationsTable(conn: { query: (sql: string) => Promise<unknown> }): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_schema_migrations_name (name)
    ) ENGINE = InnoDB
  `);
}

async function run(): Promise<void> {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    logger.warn('No migration files found');
    return;
  }

  const conn = await getMigrationConnection();
  try {
    await ensureMigrationsTable(conn);
    for (const file of files) {
      const applied = await isApplied(conn, file);
      if (applied) {
        logger.info(`Already applied: ${file}`);
        continue;
      }

      logger.info(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      logger.info(`Applied: ${file}`);
    }
    logger.info('All migrations are up to date.');
  } finally {
    await conn.end();
  }
}

async function isApplied(
  conn: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  name: string
): Promise<boolean> {
  const result = await conn.query('SELECT name FROM schema_migrations WHERE name = ?', [name]);
  const rows = Array.isArray(result) && Array.isArray(result[0]) ? (result[0] as unknown[]) : [];
  return rows.length > 0;
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Migration failed', err);
      process.exit(1);
    });
}

export { run, MIGRATIONS_DIR };