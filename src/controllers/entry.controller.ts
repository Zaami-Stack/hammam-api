import { Request, Response } from 'express';
import { createEntrance, getEntrance, listEntrances } from '../services/entry.service';
import { created, ok, paginated } from '../utils/response';
import { parseInput } from '../utils/validate';
import { createEntrySchema } from '../validators/entry.validator';
import { entriesFilterSchema } from '../validators/query.validator';

export async function createEntry(req: Request, res: Response): Promise<void> {
  const input = parseInput(createEntrySchema, req.body);
  const entry = await createEntrance(req.user!, input);
  created(res, entry);
}

export async function listEntries(req: Request, res: Response): Promise<void> {
  const filters = parseInput(entriesFilterSchema, req.query);
  const result = await listEntrances(
    req.user!,
    {
      from: filters.from,
      to: filters.to,
      hammamId: filters.hammamId,
      categoryId: filters.categoryId,
      userId: filters.userId,
    },
    filters.page,
    filters.limit
  );
  paginated(res, result.rows, result.pagination);
}

export async function getEntry(req: Request, res: Response): Promise<void> {
  const entry = await getEntrance(req.user!, Number(req.params.id));
  ok(res, entry);
}