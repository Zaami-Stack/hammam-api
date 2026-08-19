import { existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-secret-key-that-is-longer-than-thirty-two-characters';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
process.env.COOKIE_SECURE = process.env.COOKIE_SECURE || 'false';

const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (testDbUrl) {
  process.env.DATABASE_URL = testDbUrl;
}

export const TEST_DB_AVAILABLE = Boolean(testDbUrl);
export const SEEDS_DIR = path.resolve(__dirname, '../../database/seeds');

if (!TEST_DB_AVAILABLE) {
  console.warn(
    '\n[test] TEST_DATABASE_URL not set. Database-backed test suites will be skipped.\n' +
      'Set TEST_DATABASE_URL (or DATABASE_URL) in backend/.env to run them.\n'
  );
}

export { existsSync, path as pathModule };