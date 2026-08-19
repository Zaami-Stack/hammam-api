import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_DB_AVAILABLE } from './setup';
import { resetDb } from './dbHelpers';
import { client } from './helpers';

describe.skipIf(!TEST_DB_AVAILABLE)('Pagination and filtering', () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function adminClient() {
    const c = client();
    await c.post('/api/auth/login').send({ email: 'admin@hammam.ma', password: 'Admin@123' });
    return c;
  }

  async function seedEntries(total: number) {
    const c = await adminClient();
    for (let i = 0; i < total; i++) {
      await c.post('/api/entries').send({
        hammamId: (i % 2) + 1,
        categoryId: (i % 2) + 1,
      });
    }
    return c;
  }

  it('paginates entries server-side', async () => {
    await seedEntries(150);
    const c = await adminClient();
    const res = await c.get('/api/entries?page=1&limit=25');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(25);
    expect(res.body.pagination.total).toBe(150);
    expect(res.body.pagination.totalPages).toBe(6);
    expect(res.body.pagination.page).toBe(1);
  });

  it('returns the correct page offsets', async () => {
    await seedEntries(60);
    const c = await adminClient();
    const page1 = await c.get('/api/entries?page=1&limit=25');
    const page3 = await c.get('/api/entries?page=3&limit=25');
    expect(page1.body.data).toHaveLength(25);
    expect(page3.body.data).toHaveLength(10);
    const ids = new Set([...page1.body.data, ...page3.body.data].map((e) => e.id));
    expect(ids.size).toBe(35);
  });

  it('caps the page size', async () => {
    const c = await adminClient();
    const res = await c.get('/api/entries?page=1&limit=500');
    expect(res.status).toBe(400);
  });

  it('filters by hammam and category', async () => {
    await seedEntries(40);
    const c = await adminClient();
    const res = await c.get('/api/entries?hammamId=1&categoryId=1&limit=100');
    for (const row of res.body.data) {
      expect(row.hammam_name).toBe('Men');
      expect(row.category_name).toBe('Adult');
    }
  });

  it('filters by date range', async () => {
    await seedEntries(5);
    const c = await adminClient();
    const res = await c.get(
      '/api/entries?from=2026-08-18&to=2026-08-20&limit=100'
    );
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(5);
  });

  it('returns empty results for a date range with no entries', async () => {
    await seedEntries(5);
    const c = await adminClient();
    const res = await c.get(
      '/api/entries?from=2020-01-01&to=2020-01-10'
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('rejects invalid date filters', async () => {
    const c = await adminClient();
    const res = await c.get('/api/entries?from=not-a-date');
    expect(res.status).toBe(400);
  });

  it('filters users by search term', async () => {
    const c = await adminClient();
    const res = await c.get('/api/users?search=fatima');
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].email).toBe('fatima@hammam.ma');
  });

  it('filters users by role and status', async () => {
    const c = await adminClient();
    await c.patch('/api/users/2/status').send({ is_active: false });
    const res = await c.get('/api/users?role=RECEPTION&status=inactive');
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].id).toBe(2);
  });
});