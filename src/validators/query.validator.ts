import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Utilisez le format AAAA-MM-JJ')
  .superRefine((value, ctx) => {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() !== m - 1 ||
      date.getUTCDate() !== d
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date du calendrier invalide' });
    }
  });

export { dateString };

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const dashboardQuerySchema = z.object({
  period: z.enum(['today', 'yesterday', 'this_week', 'this_month', 'this_year', 'custom']).default('today'),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const entriesFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  from: dateString.optional(),
  to: dateString.optional(),
  hammamId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
});