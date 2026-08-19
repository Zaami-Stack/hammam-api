import { describe, expect, it, beforeEach } from 'vitest';
import { TEST_DB_AVAILABLE } from './setup';
import { resetDb } from './dbHelpers';
import { client } from './helpers';

describe.skipIf(!TEST_DB_AVAILABLE)('Authentication', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('allows a valid admin login and stores a session cookie', async () => {
    const res = await client().post('/api/auth/login').send({
      email: 'admin@hammam.ma',
      password: 'Admin@123',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@hammam.ma');
    expect(res.body.data.role).toBe('ADMIN');
    expect(res.body.data.password_hash).toBeUndefined();
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(cookies?.some((c) => c.includes('hammam_token='))).toBe(true);
  });

  it('rejects an invalid password', async () => {
    const res = await client().post('/api/auth/login').send({
      email: 'admin@hammam.ma',
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects an unknown email', async () => {
    const res = await client().post('/api/auth/login').send({
      email: 'nobody@hammam.ma',
      password: 'whatever123',
    });
    expect(res.status).toBe(401);
  });

  it('rejects login for an inactive user', async () => {
    const { c: adminClient } = await login('admin@hammam.ma', 'Admin@123');
    await adminClient.patch('/api/users/2/status').send({ is_active: false });
    const res = await client().post('/api/auth/login').send({
      email: 'fatima@hammam.ma',
      password: 'Reception@123',
    });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('deactivated');
  });

  it('returns the current user from /me', async () => {
    const c = client();
    await c.post('/api/auth/login').send({ email: 'admin@hammam.ma', password: 'Admin@123' });
    const res = await c.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@hammam.ma');
  });

  it('rejects /me without a session', async () => {
    const res = await client().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects requests without the client header', async () => {
    const res = await client().agent.post('/api/auth/login').send({
      email: 'admin@hammam.ma',
      password: 'Admin@123',
    });
    expect(res.status).toBe(403);
  });

  it('logs out and invalidates the session', async () => {
    const c = client();
    await c.post('/api/auth/login').send({ email: 'admin@hammam.ma', password: 'Admin@123' });
    const out = await c.post('/api/auth/logout');
    expect(out.status).toBe(200);
    const me = await c.get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});

async function login(email: string, password: string) {
  const c = client();
  await c.post('/api/auth/login').send({ email, password });
  return { c };
}