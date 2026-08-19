import { z } from 'zod';

export const createEntrySchema = z.object({
  hammamId: z.coerce.number().int().positive('Select a valid hammam'),
  categoryId: z.coerce.number().int().positive('Select a valid category'),
});