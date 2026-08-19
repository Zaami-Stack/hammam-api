import { Request, Response } from 'express';
import { getDashboard } from '../services/dashboard.service';
import { ok } from '../utils/response';
import { parseInput } from '../utils/validate';
import { dashboardQuerySchema } from '../validators/query.validator';

export async function dashboard(req: Request, res: Response): Promise<void> {
  const query = parseInput(dashboardQuerySchema, req.query);
  const data = await getDashboard(query.period, query.from, query.to);
  ok(res, data);
}