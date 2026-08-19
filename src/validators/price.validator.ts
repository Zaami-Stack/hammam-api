import { z } from 'zod';

export const updatePriceSchema = z.object({
  price: z
    .number()
    .positive('Le prix doit être supérieur à zéro')
    .max(99999.99, 'Le prix est trop élevé')
    .multipleOf(0.01, 'Le prix ne peut pas avoir plus de 2 décimales'),
});