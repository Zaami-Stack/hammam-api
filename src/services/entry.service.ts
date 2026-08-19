import { getPool } from '../db/pool';
import { createEntry, EntryFilters, findEntryById, listEntries } from '../repositories/entry.repo';
import { getPriceByCombination } from '../repositories/price.repo';
import { categoryExists, hammamExists } from '../repositories/validate.repo';
import { EntryWithNames, Pagination, SafeUser } from '../types/entities';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { casablancaToday, resolveRange } from '../utils/time';

export interface CreateEntryInput {
  hammamId: number;
  categoryId: number;
}

export async function createEntrance(actor: SafeUser, input: CreateEntryInput): Promise<EntryWithNames> {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const hammam = await hammamExists(conn, input.hammamId);
    if (!hammam) {
      await conn.rollback();
      throw new NotFoundError('Hammam introuvable');
    }

    const category = await categoryExists(conn, input.categoryId);
    if (!category) {
      await conn.rollback();
      throw new NotFoundError('Catégorie introuvable');
    }

    const price = await getPriceByCombination(conn, input.hammamId, input.categoryId);
    if (!price) {
      await conn.rollback();
      throw new NotFoundError("Aucun tarif n'est configuré pour cette combinaison hammam/catégorie");
    }

    const entry = await createEntry(conn, {
      hammam_id: input.hammamId,
      category_id: input.categoryId,
      price: price.price,
      user_id: actor.id,
    });

    await conn.commit();
    return entry;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export interface EntryListFilters {
  from?: string;
  to?: string;
  hammamId?: number;
  categoryId?: number;
  userId?: number;
}

export async function listEntrances(
  actor: SafeUser,
  filters: EntryListFilters,
  page: number,
  limit: number
): Promise<{ rows: EntryWithNames[]; pagination: Pagination }> {
  const offset = (page - 1) * limit;
  const dbFilters: EntryFilters = {};

  if (actor.role !== 'ADMIN') {
    dbFilters.userId = actor.id;
    const today = casablancaToday();
    dbFilters.from = resolveRange('custom', today, today).start;
    dbFilters.to = resolveRange('custom', today, today).end;
  } else {
    if (filters.hammamId !== undefined) dbFilters.hammamId = filters.hammamId;
    if (filters.categoryId !== undefined) dbFilters.categoryId = filters.categoryId;
    if (filters.userId !== undefined) dbFilters.userId = filters.userId;
    if (filters.from) {
      dbFilters.from = resolveRange('custom', filters.from, filters.from).start;
    }
    if (filters.to) {
      dbFilters.to = resolveRange('custom', filters.to, filters.to).end;
    }
  }

  const result = await listEntries(dbFilters, offset, limit);
  return {
    rows: result.rows.map((r) => ({
      ...r,
      created_at: new Date(r.created_at),
    })),
    pagination: result.pagination,
  };
}

export async function getEntrance(actor: SafeUser, id: number): Promise<EntryWithNames> {
  const entry = await findEntryById(id);
  if (!entry) throw new NotFoundError('Entrée introuvable');
  if (actor.role !== 'ADMIN' && entry.user_id !== actor.id) {
    throw new ForbiddenError("Vous ne pouvez pas consulter les entrées des autres agents");
  }
  return entry;
}