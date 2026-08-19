import { z } from 'zod';

export const updatePriceSchema = z.object({
  price: z
    .number()
    .positive('Price must be greater than zero')
    .max(99999.99, 'Price is too large')
    .multipleOf(0.01, 'Price can have at most 2 decimal places'),
});