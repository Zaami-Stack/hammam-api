import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_DB_AVAILABLE } from './setup';
import { resetDb } from './dbHelpers';
import { client } from './helpers';
import { getPool } from '../src/db/pool';

describe.skipIf(!TEST_DB_AVAILABLE)('Entrances', () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function login(email: string, password: string) {
    const c = client();
    await c.post('/api/auth/login').send({ email, password });
    return c;
  }

  async function setPrice(hammamId: number, categoryId: number, price: number) {
    const res = await getPool().query(
      'SELECT id FROM prices WHERE hammam_id = ? AND category_id = ?',
      [hammamId, categoryId]
    );
    const id = res[0][0].id;
    const admin = await login('admin@hammam.ma', 'Admin@123');
    const out = await admin.put(`/api/prices/${id}`).send({ price });
    expect(out.status).toBe(200);
    return id;
  }

  it('creates an entry using the database price and ignores client price', async () => {
    const admin = await login('admin@hammam.ma', 'Admin@123');
    await setPrice(1, 1, 20);
    const res = await admin
      .post('/api/entries')
      .send({ hammamId: 1, categoryId: 1, price: 999 });
    expect(res.status).toBe(201);
    expect(res.body.data.hammam_name).toBe('Men');
    expect(res.body.data.category_name).toBe('Adult');
    expect(res.body.data.price).toBe(20);
  });

  it('rejects an invalid hammam', async () => {
    const admin = await login('admin@hammam.ma', 'Admin@123');
    const res = await admin.post('/api/entries').send({ hammamId: 999, categoryId: 1 });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid category', async () => {
    const admin = await login('admin@hammam.ma', 'Admin@123');
    const res = await admin.post('/api/entries').send({ hammamId: 1, categoryId: 999 });
    expect(res.status).toBe(404);
  });

  it('rejects entry creation when no price is configured', async () => {
    await getPool().query('DELETE FROM prices WHERE hammam_id = 2 AND category_id = 2');
    const admin = await login('admin@hammam.ma', 'Admin@123');
    const res = await admin.post('/api/entries').send({ hammamId: 2, categoryId: 2 });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('No price is configured');
  });

  it('preserves historical prices when the current price changes', async () => {
    const admin = await login('admin@hammam.ma', 'Admin@123');
    await setPrice(1, 1, 20);
    const first = await admin.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    expect(first.body.data.price).toBe(20);

    await setPrice(1, 1, 25);
    const second = await admin.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    expect(second.body.data.price).toBe(25);

    const list = await admin.get('/api/entries?hammamId=1&categoryId=1&limit=50');
    const prices = list.body.data.map((e) => e.price).sort((a, b) => a - b);
    expect(prices).toEqual([20, 25]);

    const dash = await admin.get('/api/dashboard?period=today');
    expect(dash.body.data.entries.menAdults).toBe(2);
    expect(dash.body.data.revenue).toBe(45);

    const firstFresh = await admin.get(`/api/entries/${first.body.data.id}`);
    expect(firstFresh.body.data.price).toBe(20);
  });

  it('prevents reception from viewing other agents entries', async () => {
    const admin = await login('admin@hammam.ma', 'Admin@123');
    const fatima = await login('fatima@hammam.ma', 'Reception@123');
    const created = await admin.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    const entryId = created.body.data.id;
    const res = await fatima.get(`/api/entries/${entryId}`);
    expect(res.status).toBe(403);
  });

  it('does not allow editing existing entries (no update endpoint)', async () => {
    const admin = await login('admin@hammam.ma', 'Admin@123');
    const created = await admin.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    const res = await admin.put(`/api/entries/${created.body.data.id}`).send({ price: 1 });
    expect(res.status).toBe(404);
  });
});