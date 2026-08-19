import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../db/pool';
import { PaginatedResult, Role, User } from '../types/entities';

type UserRow = User & RowDataPacket;

export async function findUserById(id: number): Promise<User | null> {
  const [rows] = await getPool().query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await getPool().query<UserRow[]>(
    'SELECT * FROM users WHERE email = LOWER(?)',
    [email]
  );
  return rows[0] ?? null;
}

export async function createUser(data: {
  name: string;
  email: string;
  password_hash: string;
  role: Role;
}): Promise<User> {
  const [result] = await getPool().query<ResultSetHeader>(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [data.name, data.email.toLowerCase(), data.password_hash, data.role]
  );
  const user = await findUserById(result.insertId);
  if (!user) throw new Error('Failed to load created user');
  return user;
}

export async function updateUser(
  id: number,
  fields: { name?: string; email?: string; role?: Role }
): Promise<User | null> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return findUserById(id);
  const setSql = entries
    .map(([k]) => `${k === 'email' ? 'email' : k} = ?`)
    .join(', ');
  const values = entries.map(([k, v]) =>
    typeof v === 'string' && k === 'email' ? v.toLowerCase() : v
  );
  await getPool().query(`UPDATE users SET ${setSql} WHERE id = ?`, [...values, id]);
  return findUserById(id);
}

export async function setUserActive(id: number, isActive: boolean): Promise<void> {
  await getPool().query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id]);
}

export async function setUserPassword(id: number, passwordHash: string): Promise<void> {
  await getPool().query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

export async function countActiveAdmins(excludeId?: number): Promise<number> {
  const params: number[] = [];
  let sql = "SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN' AND is_active = TRUE";
  if (excludeId !== undefined) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  const [rows] = await getPool().query<RowDataPacket[]>(sql, params);
  return Number(rows[0].total);
}

export interface UserListFilters {
  search?: string;
  role?: Role;
  status?: 'active' | 'inactive';
}

export async function listUsers(
  filters: UserListFilters,
  offset: number,
  limit: number
): Promise<PaginatedResult<User>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push('(name LIKE ? OR email LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like);
  }
  if (filters.role) {
    where.push('role = ?');
    params.push(filters.role);
  }
  if (filters.status === 'active') {
    where.push('is_active = TRUE');
  } else if (filters.status === 'inactive') {
    where.push('is_active = FALSE');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await getPool().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM users ${whereSql}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await getPool().query<UserRow[]>(
    `SELECT * FROM users ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
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