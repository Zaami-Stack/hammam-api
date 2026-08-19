import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().optional(),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z.coerce.number().int().positive().optional(),
  DATABASE_USER: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_SSL: z.enum(['true', 'false', 'verify-identity']).default('true'),
  DATABASE_SSL_CA: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: z.string().default('false'),
  TRUST_PROXY: z.string().default('false'),
  TEST_DATABASE_URL: z.string().optional(),
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  console.error('[env] Invalid environment configuration:\n' + missing);
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Invalid environment configuration. Check your .env file.');
  }
  process.exit(1);
}

export const env = parsed.data;

export const IS_PRODUCTION = env.NODE_ENV === 'production';
export const IS_TEST = env.NODE_ENV === 'test';

export function corsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
