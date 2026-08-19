import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_DB_AVAILABLE } from './setup';
import { resetDb } from './dbHelpers';
import { client } from './helpers';

/**
 * These assertions compute expected values from the current `prices` table
 * (authoritative, from the database) and compare them against the dashboard
 * aggregation endpoints.
 */

describe.skipIf(!TEST_DB_AVAILABLE)('Dashboard', () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function adminClient() {
    const c = client();
    await c.post('/api/auth/login').send({ email: 'admin@hammam.ma', password: 'Admin@123' });
    return c;
  }

  async function currentPrice(hammamId: number, categoryId: number): Promise<number> {
    const c = await adminClient();
    const res = await c.get('/api/prices');
    const row = res.body.data.find(
      (p) => p.hammam_id === hammamId && p.category_id === categoryId
    );
    return Number(row.price);
  }

  it('computes dashboard totals and revenue from the database', async () => {
    const c = await adminClient();
    const menAdult = await currentPrice(1, 1);
    const menChild = await currentPrice(1, 2);
    const womenAdult = await currentPrice(2, 1);
    const womenChild = await currentPrice(2, 2);

    const counts = {
      menAdults: 53,
      menChildren: 12,
      womenAdults: 81,
      womenChildren: 19,
    };

    for (let i = 0; i < counts.menAdults; i++)
      await c.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    for (let i = 0; i < counts.menChildren; i++)
      await c.post('/api/entries').send({ hammamId: 1, categoryId: 2 });
    for (let i = 0; i < counts.womenAdults; i++)
      await c.post('/api/entries').send({ hammamId: 2, categoryId: 1 });
    for (let i = 0; i < counts.womenChildren; i++)
      await c.post('/api/entries').send({ hammamId: 2, categoryId: 2 });

    const res = await c.get('/api/dashboard?period=today');
    expect(res.status).toBe(200);

    const expectedRevenue =
      counts.menAdults * menAdult +
      counts.menChildren * menChild +
      counts.womenAdults * womenAdult +
      counts.womenChildren * womenChild;

    expect(res.body.data.entries.menAdults).toBe(53);
    expect(res.body.data.entries.menChildren).toBe(12);
    expect(res.body.data.entries.womenAdults).toBe(81);
    expect(res.body.data.entries.womenChildren).toBe(19);
    expect(res.body.data.entries.total).toBe(165);
    expect(res.body.data.revenue).toBe(expectedRevenue);
  });

  it('returns a daily series and agent breakdown', async () => {
    const c = await adminClient();
    await c.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    await c.post('/api/entries').send({ hammamId: 2, categoryId: 2 });
    const res = await c.get('/api/dashboard?period=today');
    expect(res.body.data.daily.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.byAgent.length).toBeGreaterThanOrEqual(1);
    const totalDaily = res.body.data.daily.reduce((acc, d) => acc + d.entries, 0);
    expect(totalDaily).toBe(2);
  });

  it('supports custom periods with date filters', async () => {
    const c = await adminClient();
    await c.post('/api/entries').send({ hammamId: 1, categoryId: 1 });
    const today = new Date().toISOString().slice(0, 10);
    const res = await c.get(`/api/dashboard?period=custom&from=${today}&to=${today}`);
    expect(res.status).toBe(200);
    expect(res.body.data.entries.total).toBe(1);
  });

  it('rejects an invalid period', async () => {
    const c = await adminClient();
    const res = await c.get('/api/dashboard?period=last_quarter');
    expect(res.status).toBe(400);
  });

  it('rejects custom range without dates', async () => {
    const c = await adminClient();
    const res = await c.get('/api/dashboard?period=custom');
    expect(res.status).toBe(400);
  });

  it('rejects custom range when from is after to', async () => {
    const c = await adminClient();
    const res = await c.get('/api/dashboard?period=custom&from=2026-08-19&to=2026-08-01');
    expect(res.status).toBe(400);
  });

  it('returns zero values for an empty report instead of crashing', async () => {
    const c = await adminClient();
    const res = await c.get('/api/dashboard?period=custom&from=2020-01-01&to=2020-01-05');
    expect(res.status).toBe(200);
    expect(res.body.data.entries.total).toBe(0);
    expect(res.body.data.revenue).toBe(0);
    expect(res.body.data.byAgent).toEqual([]);
  });

  it('rejects an invalid date format for custom ranges', async () => {
    const c = await adminClient();
    const res = await c.get('/api/dashboard?period=custom&from=19-08-2026&to=2026-08-19');
    expect(res.status).toBe(400);
  });
});