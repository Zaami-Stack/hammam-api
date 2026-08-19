import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_DB_AVAILABLE } from './setup';
import { resetDb } from './dbHelpers';
import { client } from './helpers';

describe.skipIf(!TEST_DB_AVAILABLE)('Users management', () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function adminClient() {
    const c = client();
    await c.post('/api/auth/login').send({ email: 'admin@hammam.ma', password: 'Admin@123' });
    return c;
  }

  it('creates a new reception user', async () => {
    const c = await adminClient();
    const res = await c.post('/api/users').send({
      name: 'Karima',
      email: 'karima@hammam.ma',
      password: 'Karima@2024',
      role: 'RECEPTION',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('RECEPTION');
    expect(res.body.data.password_hash).toBeUndefined();

    const login = await client()
      .post('/api/auth/login')
      .send({ email: 'karima@hammam.ma', password: 'Karima@2024' });
    expect(login.status).toBe(200);
  });

  it('rejects duplicate emails with 409', async () => {
    const c = await adminClient();
    const res = await c.post('/api/users').send({
      name: 'Duplicate',
      email: 'fatima@hammam.ma',
      password: 'Duplicate@1',
      role: 'RECEPTION',
    });
    expect(res.status).toBe(409);
  });

  it('rejects case-insensitive duplicate emails', async () => {
    const c = await adminClient();
    const res = await c.post('/api/users').send({
      name: 'Duplicate',
      email: 'FATIMA@HAMMAM.MA',
      password: 'Duplicate@1',
      role: 'RECEPTION',
    });
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords', async () => {
    const c = await adminClient();
    const res = await c.post('/api/users').send({
      name: 'Weak',
      email: 'weak@hammam.ma',
      password: 'abc',
      role: 'RECEPTION',
    });
    expect(res.status).toBe(400);
  });

  it('edits a user', async () => {
    const c = await adminClient();
    const res = await c.put('/api/users/1').send({ name: 'Super Admin' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Super Admin');
  });

  it('deactivates and reactivates a user', async () => {
    const c = await adminClient();
    const off = await c.patch('/api/users/2/status').send({ is_active: false });
    expect(off.status).toBe(200);
    expect(off.body.data.is_active).toBe(false);

    const blocked = await client()
      .post('/api/auth/login')
      .send({ email: 'fatima@hammam.ma', password: 'Reception@123' });
    expect(blocked.status).toBe(403);

    const on = await c.patch('/api/users/2/status').send({ is_active: true });
    expect(on.status).toBe(200);
    expect(on.body.data.is_active).toBe(true);
  });

  it('prevents deactivating the last active administrator', async () => {
    const c = await adminClient();
    const res = await c.patch('/api/users/1/status').send({ is_active: false });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('last active administrator');
  });

  it('prevents demoting the last active administrator', async () => {
    const c = await adminClient();
    const res = await c.put('/api/users/1').send({ role: 'RECEPTION' });
    expect(res.status).toBe(409);
  });

  it('allows deactivation when another active admin exists', async () => {
    const c = await adminClient();
    await c.post('/api/users').send({
      name: 'Second Admin',
      email: 'admin2@hammam.ma',
      password: 'Admin2@123',
      role: 'ADMIN',
    });
    const res = await c.patch('/api/users/1/status').send({ is_active: false });
    expect(res.status).toBe(200);
    expect(res.body.data.is_active).toBe(false);
  });

  it('resets a user password', async () => {
    const c = await adminClient();
    const res = await c.patch('/api/users/2/password').send({ password: 'NewPass@123' });
    expect(res.status).toBe(200);

    const oldLogin = await client()
      .post('/api/auth/login')
      .send({ email: 'fatima@hammam.ma', password: 'Reception@123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await client()
      .post('/api/auth/login')
      .send({ email: 'fatima@hammam.ma', password: 'NewPass@123' });
    expect(newLogin.status).toBe(200);
  });

  it('does not expose password hashes in user lists', async () => {
    const c = await adminClient();
    const res = await c.get('/api/users?limit=50');
    for (const row of res.body.data) {
      expect(row.password_hash).toBeUndefined();
      expect(row.password).toBeUndefined();
    }
  });
});