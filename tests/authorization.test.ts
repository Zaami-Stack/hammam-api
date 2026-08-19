import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_DB_AVAILABLE } from './setup';
import { resetDb } from './dbHelpers';
import { client } from './helpers';

describe.skipIf(!TEST_DB_AVAILABLE)('Role-based authorization', () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function login(email: string, password: string) {
    const c = client();
    await c.post('/api/auth/login').send({ email, password });
    return c;
  }

  it('allows admins to access user management', async () => {
    const c = await login('admin@hammam.ma', 'Admin@123');
    const res = await c.get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('blocks reception from user management API', async () => {
    const c = await login('fatima@hammam.ma', 'Reception@123');
    const res = await c.get('/api/users');
    expect(res.status).toBe(403);
  });

  it('blocks reception from reports API', async () => {
    const c = await login('fatima@hammam.ma', 'Reception@123');
    const res = await c.get('/api/reports/daily');
    expect(res.status).toBe(403);
  });

  it('blocks reception from updating prices', async () => {
    const c = await login('fatima@hammam.ma', 'Reception@123');
    const res = await c.put('/api/prices/1').send({ price: 30 });
    expect(res.status).toBe(403);
  });

  it('allows reception to read prices, hammams and categories', async () => {
    const c = await login('fatima@hammam.ma', 'Reception@123');
    const prices = await c.get('/api/prices');
    const hammams = await c.get('/api/hammams');
    const categories = await c.get('/api/categories');
    expect(prices.status).toBe(200);
    expect(hammams.status).toBe(200);
    expect(categories.status).toBe(200);
  });

  it('blocks unauthenticated access to protected endpoints', async () => {
    const res = await client().get('/api/entries');
    expect(res.status).toBe(401);
  });

  it('allows reception to create an entrance', async () => {
    const c = await login('fatima@hammam.ma', 'Reception@123');
    const res = await c.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.price).toBeGreaterThan(0);
  });

  it('restricts reception listings to their own entries of the current day', async () => {
    const admin = await login('admin@hammam.ma', 'Admin@123');
    const fatima = await login('fatima@hammam.ma', 'Reception@123');
    const amina = await login('amina@hammam.ma', 'Reception@123');

    await admin.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    await fatima.post('/api/entries').send({ hammamId: 1, categoryId: 2 });
    await fatima.post('/api/entries').send({ hammamId: 2, categoryId: 1 });
    await amina.post('/api/entries').send({ hammamId: 2, categoryId: 2 });

    const res = await fatima.get('/api/entries?limit=50');
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(2);
    for (const row of res.body.data) {
      expect(row.user_name).toBe('Fatima');
    }
  });
});