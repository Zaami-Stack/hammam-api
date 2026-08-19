import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../db/pool';
import { PriceRow, PriceWithNames } from '../types/entities';

type PriceRowPacket = PriceRow & RowDataPacket;
type PriceWithNamesRow = PriceWithNames & RowDataPacket;

type Conn = Pool | PoolConnection;

export async function listPrices(): Promise<PriceWithNames[]> {
  const [rows] = await getPool().query<PriceWithNamesRow[]>(
    `SELECT p.id, p.hammam_id, p.category_id, p.price, p.created_at, p.updated_at,
            h.name AS hammam_name, c.name AS category_name
     FROM prices p
     JOIN hammams h ON h.id = p.hammam_id
     JOIN categories c ON c.id = p.category_id
     ORDER BY h.id ASC, c.id ASC`
  );
  return rows;
}

export async function getPriceById(id: number): Promise<PriceWithNames | null> {
  const [rows] = await getPool().query<PriceWithNamesRow[]>(
    `SELECT p.id, p.hammam_id, p.category_id, p.price, p.created_at, p.updated_at,
            h.name AS hammam_name, c.name AS category_name
     FROM prices p
     JOIN hammams h ON h.id = p.hammam_id
     JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getPriceByCombination(
  conn: Conn,
  hammamId: number,
  categoryId: number
): Promise<PriceRow | null> {
  const [rows] = await conn.query<PriceRowPacket[]>(
    'SELECT * FROM prices WHERE hammam_id = ? AND category_id = ?',
    [hammamId, categoryId]
  );
  return rows[0] ?? null;
}

export async function updatePrice(id: number, price: number): Promise<void> {
  await getPool().query('UPDATE prices SET price = ? WHERE id = ?', [price, id]);
}