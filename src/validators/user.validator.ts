import { z } from 'zod';

const userBase = {
  name: z.string().trim().min(2, 'Le nom doit comporter au moins 2 caractères').max(100),
  email: z.string().trim().email('Fournissez une adresse e-mail valide').max(255),
};

export const createUserSchema = z.object({
  ...userBase,
  password: z
    .string()
    .min(8, 'Le mot de passe doit comporter au moins 8 caractères')
    .max(128)
    .regex(/[a-zA-Z]/, 'Le mot de passe doit contenir au moins une lettre')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
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
    .min(8, 'Le mot de passe doit comporter au moins 8 caractères')
    .max(128)
    .regex(/[a-zA-Z]/, 'Le mot de passe doit contenir au moins une lettre')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
});