import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_DB_AVAILABLE } from './setup';
import { resetDb } from './dbHelpers';
import { client } from './helpers';
import { getPool } from '../src/db/pool';

describe.skipIf(!TEST_DB_AVAILABLE)('Prices', () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function adminClient() {
    const c = client();
    await c.post('/api/auth/login').send({ email: 'admin@hammam.ma', password: 'Admin@123' });
    return c;
  }

  it('returns the four seeded price combinations', async () => {
    const c = await adminClient();
    const res = await c.get('/api/prices');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    const combos = res.body.data.map(
      (p) => `${p.hammam_name}/${p.category_name}:${p.price}`
    );
    expect(combos).toContain('Men/Adult:20');
    expect(combos).toContain('Men/Child:15');
    expect(combos).toContain('Women/Adult:20');
    expect(combos).toContain('Women/Child:15');
  });

  it('updates a price', async () => {
    const c = await adminClient();
    const res = await c.put('/api/prices/1').send({ price: 30 });
    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(30);
  });

  it('rejects non-positive prices', async () => {
    const c = await adminClient();
    const res = await c.put('/api/prices/1').send({ price: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects negative prices', async () => {
    const c = await adminClient();
    const res = await c.put('/api/prices/1').send({ price: -5 });
    expect(res.status).toBe(400);
  });

  it('rejects excessive decimal precision', async () => {
    const c = await adminClient();
    const res = await c.put('/api/prices/1').send({ price: 12.345 });
    expect(res.status).toBe(400);
  });

  it('rejects prices for a missing price id', async () => {
    const c = await adminClient();
    const res = await c.put('/api/prices/99999').send({ price: 30 });
    expect(res.status).toBe(404);
  });

  it('records a price change in the audit log', async () => {
    const c = await adminClient();
    await c.put('/api/prices/1').send({ price: 33 });
    const [rows] = await getPool().query(
      "SELECT * FROM audit_logs WHERE action = 'PRICE_UPDATE' AND entity_id = '1'"
    );
    expect(rows.length).toBe(1);
    const details =
      typeof rows[0].details === 'string' ? JSON.parse(rows[0].details) : rows[0].details;
    expect(details.old_price).toBe(20);
    expect(details.new_price).toBe(33);
  });

  it('only future entries use the new price', async () => {
    const c = await adminClient();
    await c.put('/api/prices/1').send({ price: 25 });
    const created = await c.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    expect(created.body.data.price).toBe(25);

    const [old] = await getPool().query(
      'SELECT id FROM prices WHERE hammam_id = 1 AND category_id = 1'
    );
    expect(old[0]).toBeDefined();
    await c.put(`/api/prices/${old[0].id}`).send({ price: 40 });
    await c.post('/api/entries').send({ hammamId: 1, categoryId: 1 });

    const list = await c.get('/api/entries?hammamId=1&categoryId=1&limit=50');
    const prices = list.body.data.map((e) => e.price).sort((a, b) => a - b);
    expect(prices).toEqual([25, 40]);
  });
});