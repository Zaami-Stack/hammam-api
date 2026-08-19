import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { findUserByEmail } from '../repositories/user.repo';
import { SafeUser } from '../types/entities';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { toSafeUser } from '../middleware/authenticate';

export async function login(email: string, password: string): Promise<{ user: SafeUser; token: string }> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Adresse e-mail ou mot de passe incorrecte');
  }
  if (!user.is_active) {
    throw new ForbiddenError('Ce compte a été désactivé. Contactez un administrateur.');
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new UnauthorizedError('Adresse e-mail ou mot de passe incorrecte');
  }

  const token = jwt.sign(
    { sub: String(user.id), role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return { user: toSafeUser(user), token };
}