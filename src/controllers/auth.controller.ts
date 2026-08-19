import { Request, Response } from 'express';
import { env } from '../config/env';
import { AUTH_COOKIE } from '../middleware/authenticate';
import { login } from '../services/auth.service';
import { ok } from '../utils/response';
import { jwtExpiryToMilliseconds } from '../utils/time';
import { parseInput } from '../utils/validate';
import { loginSchema } from '../validators/auth.validator';

function cookieOptions() {
  const secure = env.COOKIE_SECURE === 'true' || (env.NODE_ENV === 'production' && env.COOKIE_SECURE !== 'false');
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: jwtExpiryToMilliseconds(env.JWT_EXPIRES_IN),
  } as const;
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const input = parseInput(loginSchema, req.body);
  const { user, token } = await login(input.email, input.password);
  res.cookie(AUTH_COOKIE, token, cookieOptions());
  ok(res, user);
}

export async function handleLogout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  ok(res, { message: 'Déconnexion réussie' });
}

export async function handleMe(req: Request, res: Response): Promise<void> {
  ok(res, req.user);
}