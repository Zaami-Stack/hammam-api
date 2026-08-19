import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../db/pool';
import { EntryWithNames, PaginatedResult } from '../types/entities';

type EntryWithNamesRow = EntryWithNames & RowDataPacket;

type Conn = Pool | PoolConnection;

export async function deleteAllEntries(): Promise<number> {
  const [result] = await getPool().execute<ResultSetHeader>('DELETE FROM entries');
  return result.affectedRows;
}

export interface EntryFilters {
  from?: Date;
  to?: Date;
  hammamId?: number;
  categoryId?: number;
  userId?: number;
}

export async function createEntry(
  conn: Conn,
  data: { hammam_id: number; category_id: number; price: number; user_id: number }
): Promise<EntryWithNames> {
  const [result] = await conn.execute<ResultSetHeader>(
    'INSERT INTO entries (hammam_id, category_id, price, user_id) VALUES (?, ?, ?, ?)',
    [data.hammam_id, data.category_id, data.price, data.user_id]
  );
  const entry = await findEntryById(result.insertId, conn);
  if (!entry) throw new Error('Failed to load created entry');
  return entry;
}

export async function findEntryById(id: number, conn?: Conn): Promise<EntryWithNames | null> {
  const db = conn ?? getPool();
  const [rows] = await db.query<EntryWithNamesRow[]>(
    `SELECT e.id, e.hammam_id, e.category_id, e.price, e.user_id, e.created_at,
            h.name AS hammam_name, c.name AS category_name, u.name AS user_name
     FROM entries e
     JOIN hammams h ON h.id = e.hammam_id
     JOIN categories c ON c.id = e.category_id
     JOIN users u ON u.id = e.user_id
     WHERE e.id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listEntries(
  filters: EntryFilters,
  offset: number,
  limit: number
): Promise<PaginatedResult<EntryWithNames>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.from) {
    where.push('e.created_at >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    where.push('e.created_at < ?');
    params.push(filters.to);
  }
  if (filters.hammamId !== undefined) {
    where.push('e.hammam_id = ?');
    params.push(filters.hammamId);
  }
  if (filters.categoryId !== undefined) {
    where.push('e.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.userId !== undefined) {
    where.push('e.user_id = ?');
    params.push(filters.userId);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await getPool().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM entries e ${whereSql}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await getPool().query<EntryWithNamesRow[]>(
    `SELECT e.id, e.hammam_id, e.category_id, e.price, e.user_id, e.created_at,
            h.name AS hammam_name, c.name AS category_name, u.name AS user_name
     FROM entries e
     JOIN hammams h ON h.id = e.hammam_id
     JOIN categories c ON c.id = e.category_id
     JOIN users u ON u.id = e.user_id
     ${whereSql}
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    rows,
    pagination: {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}