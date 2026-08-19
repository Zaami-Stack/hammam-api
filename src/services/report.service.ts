import { byAgent, dailySeries, seriesByBucket, summaryByCombo } from '../repositories/dashboard.repo';
import { referenceMaps } from '../repositories/meta.repo';
import { DashboardSummary } from '../types/entities';
import { BadRequestError } from '../utils/errors';
import {
  casablancaToday,
  getUtcOffsetMinutes,
  isValidDateString,
  mondayOfWeek,
  resolveRange,
  shiftCasablancaDate,
} from '../utils/time';

function buildSummary(
  comboRows: { hammam_id: number; category_id: number; count: number; revenue: number }[],
  refs: Awaited<ReturnType<typeof referenceMaps>>
): DashboardSummary {
  const summary: DashboardSummary = {
    menAdults: 0,
    menChildren: 0,
    womenAdults: 0,
    womenChildren: 0,
    total: 0,
    revenue: 0,
  };
  for (const row of comboRows) {
    const hammam = refs.hammamName.get(row.hammam_id);
    const category = refs.categoryName.get(row.category_id);
    summary.total += row.count;
    summary.revenue += row.revenue;
    if (hammam === 'Men' && category === 'Adult') summary.menAdults = row.count;
    if (hammam === 'Men' && category === 'Child') summary.menChildren = row.count;
    if (hammam === 'Women' && category === 'Adult') summary.womenAdults = row.count;
    if (hammam === 'Women' && category === 'Child') summary.womenChildren = row.count;
  }
  return summary;
}

function requireValidDate(date?: string, fallback?: string): string {
  if (!date) {
    if (fallback) return fallback;
    return casablancaToday();
  }
  if (!isValidDateString(date)) {
    throw new BadRequestError('Invalid date, use YYYY-MM-DD');
  }
  return date;
}

export async function dailyReport(dateStr?: string) {
  const date = requireValidDate(dateStr);
  const range = resolveRange('custom', date, date);
  const [comboRows, agents, refs] = await Promise.all([
    summaryByCombo(range.start, range.end),
    byAgent(range.start, range.end),
    referenceMaps(),
  ]);
  return { date, entries: buildSummary(comboRows, refs), byAgent: agents };
}

export async function weeklyReport(dateStr?: string) {
  const date = requireValidDate(dateStr);
  const weekStart = mondayOfWeek(date);
  const range = resolveRange('custom', weekStart, date);
  const [comboRows, daily, refs] = await Promise.all([
    summaryByCombo(range.start, range.end),
    dailySeries(range.start, range.end, getUtcOffsetMinutes(range.start.getTime())),
    referenceMaps(),
  ]);
  return {
    weekStart,
    weekEnd: date,
    entries: buildSummary(comboRows, refs),
    daily,
  };
}

function requireValidMonth(month?: string): string {
  if (!month) return casablancaToday().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new BadRequestError('Invalid month, use YYYY-MM');
  }
  return month;
}

export async function monthlyReport(monthStr?: string) {
  const month = requireValidMonth(monthStr);
  const from = `${month}-01`;
  const to = lastDayOfMonth(month);
  const range = resolveRange('custom', from, to);
  const [comboRows, daily, agents, refs] = await Promise.all([
    summaryByCombo(range.start, range.end),
    dailySeries(range.start, range.end, getUtcOffsetMinutes(range.start.getTime())),
    byAgent(range.start, range.end),
    referenceMaps(),
  ]);
  return {
    month,
    entries: buildSummary(comboRows, refs),
    daily,
    byAgent: agents,
  };
}

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  const mm = String(last.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(last.getUTCDate()).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function requireValidYear(year?: string): string {
  if (!year) return casablancaToday().slice(0, 4);
  if (!/^\d{4}$/.test(year)) {
    throw new BadRequestError('Invalid year, use YYYY');
  }
  return year;
}

export async function yearlyReport(yearStr?: string) {
  const year = requireValidYear(yearStr);
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const range = resolveRange('custom', from, to);
  const [comboRows, monthly, refs] = await Promise.all([
    summaryByCombo(range.start, range.end),
    seriesByBucket(range.start, range.end, getUtcOffsetMinutes(range.start.getTime()), '%Y-%m'),
    referenceMaps(),
  ]);
  return {
    year,
    entries: buildSummary(comboRows, refs),
    monthly,
  };
}

export async function agentsReport(from?: string, to?: string) {
  if (from || to) {
    const f = requireValidDate(from, undefined);
    const t = requireValidDate(to, undefined);
    const range = resolveRange('custom', f, t);
    const agents = await byAgent(range.start, range.end);
    return { from: f, to: t, rows: agents };
  }

  const today = casablancaToday();
  const toDate = today;
  const fromDate = shiftCasablancaDate(today, -29);
  const range = resolveRange('custom', fromDate, toDate);
  const agents = await byAgent(range.start, range.end);
  return { from: fromDate, to: toDate, rows: agents };
}