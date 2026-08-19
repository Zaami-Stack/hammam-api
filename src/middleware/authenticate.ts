import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { findUserById } from '../repositories/user.repo';
import { SafeUser } from '../types/entities';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export const AUTH_COOKIE = 'hammam_token';

interface TokenPayload {
  sub: string;
  role: string;
}

export function toSafeUser(user: {
  id: number;
  name: string;
  email: string;
  role: SafeUser['role'];
  is_active: boolean;
  created_at: Date | string;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: Boolean(user.is_active),
    created_at: new Date(user.created_at).toISOString(),
  };
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.[AUTH_COOKIE] as string | undefined;
    if (!token) {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        token = header.slice('Bearer '.length);
      }
    }
    if (!token) {
      throw new UnauthorizedError();
    }

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      throw new UnauthorizedError('La session a expiré ou est invalide');
    }

    const user = await findUserById(Number(payload.sub));
    if (!user) {
      throw new UnauthorizedError("Le compte utilisateur n'existe plus");
    }
    if (!user.is_active) {
      throw new ForbiddenError('Ce compte a été désactivé');
    }

    req.user = toSafeUser(user);
    next();
  } catch (err) {
    next(err);
  }
}