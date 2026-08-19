import { z } from 'zod';
import { dateString } from './query.validator';

const monthString = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Utilisez le format AAAA-MM');

const yearString = z
  .string()
  .regex(/^\d{4}$/, 'Utilisez le format AAAA');

export const dailyReportSchema = z.object({
  date: dateString.optional(),
});

export const weeklyReportSchema = z.object({
  date: dateString.optional(),
});

export const monthlyReportSchema = z.object({
  month: monthString.optional(),
});

export const yearlyReportSchema = z.object({
  year: yearString.optional(),
});

export const agentsReportSchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
});