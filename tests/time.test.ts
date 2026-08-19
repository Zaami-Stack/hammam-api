import { describe, expect, it } from 'vitest';
import {
  BUSINESS_TIME_ZONE,
  casablancaToday,
  dayRangeUtc,
  isValidDateString,
  mondayOfWeek,
  resolveRange,
} from '../src/utils/time';
import { BadRequestError } from '../src/utils/errors';

describe('Timezone utilities (no database required)', () => {
  it('recognizes the business time zone', () => {
    expect(BUSINESS_TIME_ZONE).toBe('Africa/Casablanca');
  });

  it('returns the current Moroccan date in YYYY-MM-DD', () => {
    const today = casablancaToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('validates date strings', () => {
    expect(isValidDateString('2026-08-19')).toBe(true);
    expect(isValidDateString('19-08-2026')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2026-02-30')).toBe(false);
  });

  it('converts a Moroccan calendar day to a UTC range (Casablanca is UTC+1 in August)', () => {
    const { start, end } = dayRangeUtc('2026-08-19');
    expect(start.toISOString()).toBe('2026-08-18T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-19T23:00:00.000Z');
  });

  it('produces an ordered range whose start precedes its end', () => {
    const { start, end } = dayRangeUtc(casablancaToday());
    expect(start.getTime()).toBeLessThan(end.getTime());
    expect(end.getTime() - start.getTime()).toBeGreaterThanOrEqual(23 * 3600 * 1000);
    expect(end.getTime() - start.getTime()).toBeLessThanOrEqual(25 * 3600 * 1000);
  });

  it('computes the Monday preceding a given date', () => {
    expect(mondayOfWeek('2026-08-19')).toBe('2026-08-17');
    expect(mondayOfWeek('2026-08-17')).toBe('2026-08-17');
    expect(mondayOfWeek('2026-08-23')).toBe('2026-08-17');
  });

  it('resolves named periods to ranges', () => {
    const today = resolveRange('today');
    expect(today.period).toBe('today');
    expect(today.start.getTime()).toBeLessThan(today.end.getTime());

    const yesterday = resolveRange('yesterday');
    const todayRange = dayRangeUtc(casablancaToday());
    expect(yesterday.end.getTime()).toBeLessThanOrEqual(todayRange.start.getTime());
  });

  it('resolves custom periods to ranges', () => {
    const range = resolveRange('custom', '2026-08-01', '2026-08-19');
    expect(range.start.toISOString()).toBe('2026-07-31T23:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-08-19T23:00:00.000Z');
  });

  it('rejects custom periods without dates', () => {
    expect(() => resolveRange('custom')).toThrow(BadRequestError);
  });

  it('rejects custom periods with from after to', () => {
    expect(() => resolveRange('custom', '2026-08-19', '2026-08-01')).toThrow(BadRequestError);
  });

  it('rejects invalid periods', () => {
    expect(() => resolveRange('unknown')).toThrow(BadRequestError);
  });
});