import { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../db/pool';
import { AgentPoint, DayPoint } from '../types/entities';

interface ComboRow extends RowDataPacket {
  hammam_id: number;
  category_id: number;
  count: number;
  revenue: number;
}

export async function summaryByCombo(
  start: Date,
  end: Date
): Promise<ComboRow[]> {
  const [rows] = await getPool().query<ComboRow[]>(
    `SELECT hammam_id, category_id, COUNT(*) AS count, COALESCE(SUM(price), 0) AS revenue
     FROM entries
     WHERE created_at >= ? AND created_at < ?
     GROUP BY hammam_id, category_id`,
    [start, end]
  );
  return rows;
}

export async function dailySeries(
  start: Date,
  end: Date,
  offsetMinutes: number
): Promise<DayPoint[]> {
  const [rows] = await getPool().query<DayPoint[] & RowDataPacket[]>(
    `SELECT DATE(DATE_ADD(created_at, INTERVAL ? MINUTE)) AS day,
            COUNT(*) AS entries,
            COALESCE(SUM(price), 0) AS revenue
     FROM entries
     WHERE created_at >= ? AND created_at < ?
     GROUP BY DAY
     ORDER BY DAY ASC`,
    [offsetMinutes, start, end]
  );
  return rows;
}

export async function byAgent(
  start: Date,
  end: Date
): Promise<AgentPoint[]> {
  const [rows] = await getPool().query<AgentPoint[] & RowDataPacket[]>(
    `SELECT u.id AS user_id, u.name AS name,
            COUNT(*) AS entries,
            COALESCE(SUM(e.price), 0) AS revenue
     FROM entries e
     JOIN users u ON u.id = e.user_id
     WHERE e.created_at >= ? AND e.created_at < ?
     GROUP BY u.id, u.name
     ORDER BY entries DESC`,
    [start, end]
  );
  return rows;
}

export interface SeriesPoint extends RowDataPacket {
  label: string;
  entries: number;
  revenue: number;
}

export async function seriesByBucket(
  start: Date,
  end: Date,
  offsetMinutes: number,
  dateFormat: string
): Promise<SeriesPoint[]> {
  const [rows] = await getPool().query<SeriesPoint[]>(
    `SELECT DATE_FORMAT(DATE_ADD(created_at, INTERVAL ? MINUTE), ?) AS label,
            COUNT(*) AS entries,
            COALESCE(SUM(price), 0) AS revenue
     FROM entries
     WHERE created_at >= ? AND created_at < ?
     GROUP BY label
     ORDER BY label ASC`,
    [offsetMinutes, dateFormat, start, end]
  );
  return rows;
}