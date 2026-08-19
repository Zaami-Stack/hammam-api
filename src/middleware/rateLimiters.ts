import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

function maybeRateLimit(opts: Parameters<typeof rateLimit>[0]) {
  if (env.RATE_LIMIT_ENABLED === 'false') {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  return rateLimit(opts);
}

export const loginLimiter = maybeRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

export const apiLimiter = maybeRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});