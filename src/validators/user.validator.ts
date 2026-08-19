import { z } from 'zod';

const userBase = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Provide a valid email address').max(255),
};

export const createUserSchema = z.object({
  ...userBase,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  role: z.enum(['ADMIN', 'RECEPTION']),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
  role: z.enum(['ADMIN', 'RECEPTION']).optional(),
});

export const setStatusSchema = z.object({
  is_active: z.boolean(),
});

export const setPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});