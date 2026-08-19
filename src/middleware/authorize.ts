import { NextFunction, Request, Response } from 'express';
import { Role } from '../types/entities';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError("Vous n'avez pas la permission d'effectuer cette action"));
      return;
    }
    next();
  };
}