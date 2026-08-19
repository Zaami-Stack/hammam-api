import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../db/pool';

type Conn = Pool | PoolConnection;

interface IdRow extends RowDataPacket {
  id: number;
}

export async function findHammam(id: number): Promise<boolean> {
  const [rows] = await getPool().query<IdRow[]>('SELECT id FROM hammams WHERE id = ?', [id]);
  return rows.length > 0;
}

export async function findCategory(id: number): Promise<boolean> {
  const [rows] = await getPool().query<IdRow[]>('SELECT id FROM categories WHERE id = ?', [id]);
  return rows.length > 0;
}

export async function hammamExists(conn: Conn, id: number): Promise<boolean> {
  const [rows] = await conn.query<IdRow[]>('SELECT id FROM hammams WHERE id = ?', [id]);
  return rows.length > 0;
}

export async function categoryExists(conn: Conn, id: number): Promise<boolean> {
  const [rows] = await conn.query<IdRow[]>('SELECT id FROM categories WHERE id = ?', [id]);
  return rows.length > 0;
}