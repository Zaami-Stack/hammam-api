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
    throw new UnauthorizedError('Invalid email or password');
  }
  if (!user.is_active) {
    throw new ForbiddenError('This account has been deactivated. Contact an administrator.');
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = jwt.sign(
    { sub: String(user.id), role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return { user: toSafeUser(user), token };
}