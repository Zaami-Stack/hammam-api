import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Provide a valid email address'),
  password: z.string().min(1, 'Password is required').max(128),
});