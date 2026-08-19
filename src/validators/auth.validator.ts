import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Fournissez une adresse e-mail valide'),
  password: z.string().min(1, 'Le mot de passe est requis').max(128),
});