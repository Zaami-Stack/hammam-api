import { Request, Response } from 'express';
import { listCategories, listHammams } from '../repositories/meta.repo';
import { ok } from '../utils/response';

export async function hammams(_req: Request, res: Response): Promise<void> {
  ok(res, await listHammams());
}

export async function categories(_req: Request, res: Response): Promise<void> {
  ok(res, await listCategories());
}