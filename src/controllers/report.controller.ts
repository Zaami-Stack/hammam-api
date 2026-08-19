import { Request, Response } from 'express';
import {
  agentsReport,
  dailyReport,
  monthlyReport,
  weeklyReport,
  yearlyReport,
} from '../services/report.service';
import { ok } from '../utils/response';
import { parseInput } from '../utils/validate';
import {
  agentsReportSchema,
  dailyReportSchema,
  monthlyReportSchema,
  weeklyReportSchema,
  yearlyReportSchema,
} from '../validators/report.validator';

export async function daily(req: Request, res: Response): Promise<void> {
  const q = parseInput(dailyReportSchema, req.query);
  ok(res, await dailyReport(q.date));
}

export async function weekly(req: Request, res: Response): Promise<void> {
  const q = parseInput(weeklyReportSchema, req.query);
  ok(res, await weeklyReport(q.date));
}

export async function monthly(req: Request, res: Response): Promise<void> {
  const q = parseInput(monthlyReportSchema, req.query);
  ok(res, await monthlyReport(q.month));
}

export async function yearly(req: Request, res: Response): Promise<void> {
  const q = parseInput(yearlyReportSchema, req.query);
  ok(res, await yearlyReport(q.year));
}

export async function agents(req: Request, res: Response): Promise<void> {
  const q = parseInput(agentsReportSchema, req.query);
  ok(res, await agentsReport(q.from, q.to));
}