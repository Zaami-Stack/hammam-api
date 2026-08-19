import { PeriodRange } from '../types/entities';
import { BadRequestError } from './errors';

export const BUSINESS_TIME_ZONE = 'Africa/Casablanca';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function getUtcOffsetMinutes(wallClockMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(wallClockMs));
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asZulu = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second)
  );
  return (asZulu - wallClockMs) / 60000;
}

export function parseCasablancaDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0);
}

export function dayRangeUtc(dateStr: string): { start: Date; end: Date } {
  const startWall = parseCasablancaDate(dateStr);
  const startOffset = getUtcOffsetMinutes(startWall);
  const start = new Date(startWall - startOffset * 60000);

  const nextWall = Date.UTC(new Date(startWall).getUTCFullYear(), new Date(startWall).getUTCMonth(), new Date(startWall).getUTCDate() + 1);
  const endOffset = getUtcOffsetMinutes(nextWall);
  const end = new Date(nextWall - endOffset * 60000);

  return { start, end };
}

export function casablancaToday(): string {
  const now = Date.now();
  const offset = getUtcOffsetMinutes(now);
  const local = new Date(now + offset * 60000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftCasablancaDate(dateStr: string, days: number): string {
  const wall = parseCasablancaDate(dateStr);
  const date = new Date(wall);
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function mondayOfWeek(dateStr: string): string {
  const wall = parseCasablancaDate(dateStr);
  const date = new Date(wall);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return shiftCasablancaDate(dateStr, diff);
}

export function firstOfMonth(dateStr: string): string {
  return dateStr.slice(0, 8) + '01';
}

export function firstOfYear(dateStr: string): string {
  return dateStr.slice(0, 5) + '01-01';
}

export function validatePeriod(period: string): void {
  const allowed = ['today', 'yesterday', 'this_week', 'this_month', 'this_year', 'custom'];
  if (!allowed.includes(period)) {
    throw new BadRequestError(`Invalid period "${period}". Allowed: ${allowed.join(', ')}`);
  }
}

export function resolveRange(period: string, from?: string, to?: string): PeriodRange {
  validatePeriod(period);

  if (period === 'custom') {
    if (!from || !to) {
      throw new BadRequestError('from and to are required for custom period');
    }
    if (!isValidDateString(from) || !isValidDateString(to)) {
      throw new BadRequestError('from/to must use format YYYY-MM-DD');
    }
    if (from > to) {
      throw new BadRequestError('from date cannot be after to date');
    }
    const start = dayRangeUtc(from).start;
    const end = dayRangeUtc(to).end;
    return { start, end, period, fromLabel: from, toLabel: to };
  }

  const today = casablancaToday();
  let fromLabel: string;
  let toLabel: string;

  switch (period) {
    case 'today':
      fromLabel = today;
      toLabel = today;
      break;
    case 'yesterday':
      fromLabel = shiftCasablancaDate(today, -1);
      toLabel = fromLabel;
      break;
    case 'this_week':
      fromLabel = mondayOfWeek(today);
      toLabel = today;
      break;
    case 'this_month':
      fromLabel = firstOfMonth(today);
      toLabel = today;
      break;
    case 'this_year':
      fromLabel = firstOfYear(today);
      toLabel = today;
      break;
    default:
      throw new BadRequestError(`Unsupported period "${period}"`);
  }

  const { start } = dayRangeUtc(fromLabel);
  const { end } = dayRangeUtc(toLabel);
  return { start, end, period, fromLabel, toLabel };
}

export function displayCasablanca(date: Date): string {
  const offset = getUtcOffsetMinutes(date.getTime());
  const local = new Date(date.getTime() + offset * 60000);
  return local.toISOString().slice(0, 10);
}

export function jwtExpiryToMilliseconds(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn.trim());
  if (!match) return 12 * 3600 * 1000;
  const n = Number(match[1]);
  switch (match[2]) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 3600 * 1000;
    case 'd':
      return n * 24 * 3600 * 1000;
    default:
      return 12 * 3600 * 1000;
  }
}