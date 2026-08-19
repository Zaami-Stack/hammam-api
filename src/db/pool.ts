import fs from 'fs';
import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { env } from '../config/env';

export interface DbConfig {
  uri?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | 'verify-identity';
  sslCa?: string;
}

export function buildPoolOptions(cfg: DbConfig = {}): PoolOptions {
  const options: PoolOptions = {
    timezone: 'Z',
    charset: 'utf8mb4',
    decimalNumbers: true,
    dateStrings: false,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
  };

  if (cfg.uri) {
    options.uri = cfg.uri;
  } else {
    options.host = cfg.host;
    options.port = cfg.port;
    options.user = cfg.user;
    options.password = cfg.password;
    options.database = cfg.database;
  }

  const sslMode = cfg.ssl ?? env.DATABASE_SSL;
  if (sslMode && sslMode !== 'false') {
    const caPath = cfg.sslCa ?? env.DATABASE_SSL_CA;
    options.ssl = {
      rejectUnauthorized: sslMode === 'verify-identity',
      ...(caPath ? { ca: fs.readFileSync(caPath) } : {}),
    };
  }

  return options;
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const sslMode = env.DATABASE_SSL === 'verify-identity' ? 'verify-identity' : env.DATABASE_SSL === 'true';
    pool = mysql.createPool(
      buildPoolOptions({
        uri: env.DATABASE_URL,
        host: env.DATABASE_HOST,
        port: env.DATABASE_PORT,
        user: env.DATABASE_USER,
        password: env.DATABASE_PASSWORD,
        database: env.DATABASE_NAME,
        ssl: sslMode,
        sslCa: env.DATABASE_SSL_CA,
      })
    );
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function getMigrationConnection(): Promise<mysql.Connection> {
  const sslMode = env.DATABASE_SSL === 'verify-identity' ? 'verify-identity' : env.DATABASE_SSL === 'true';
  return mysql.createConnection({
    ...buildPoolOptions({
      uri: env.DATABASE_URL,
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      ssl: sslMode,
      sslCa: env.DATABASE_SSL_CA,
    }),
    multipleStatements: true,
  });
}
