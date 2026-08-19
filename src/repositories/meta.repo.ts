import { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../db/pool';
import { Category, Hammam } from '../types/entities';

type HammamRow = Hammam & RowDataPacket;
type CategoryRow = Category & RowDataPacket;

export async function listHammams(): Promise<Hammam[]> {
  const [rows] = await getPool().query<HammamRow[]>('SELECT id, name FROM hammams ORDER BY id ASC');
  return rows;
}

export async function listCategories(): Promise<Category[]> {
  const [rows] = await getPool().query<CategoryRow[]>('SELECT id, name FROM categories ORDER BY id ASC');
  return rows;
}

export async function referenceMaps(): Promise<{
  hammamName: Map<number, string>;
  categoryName: Map<number, string>;
}> {
  const [hamRows] = await getPool().query<HammamRow[]>('SELECT id, name FROM hammams');
  const [catRows] = await getPool().query<CategoryRow[]>('SELECT id, name FROM categories');
  return {
    hammamName: new Map(hamRows.map((h) => [h.id, h.name])),
    categoryName: new Map(catRows.map((c) => [c.id, c.name])),
  };
}