import { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../utils/errors';

const EXPECTED_HEADER = 'x-requested-with';
const EXPECTED_VALUE = 'XMLHttpRequest';

export function requireClientHeader(req: Request, _res: Response, next: NextFunction): void {
  const value = req.headers[EXPECTED_HEADER];
  if (value !== EXPECTED_VALUE) {
    next(new ForbiddenError('Request rejected: missing client header'));
    return;
  }
  next();
}