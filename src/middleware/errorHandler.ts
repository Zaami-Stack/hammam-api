import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface SqlLikeError extends Error {
  code?: string;
  errno?: number;
}

function isSqlError(err: unknown): err is SqlLikeError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Données de requête invalides',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, message: err.message, code: err.code });
    return;
  }

  if (isSqlError(err)) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, message: 'Un enregistrement avec cette valeur existe déjà', code: 'DUPLICATE' });
      return;
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({ success: false, message: 'Enregistrement lié invalide', code: 'REFERENTIAL' });
      return;
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.error('Database connection error', err);
      res.status(503).json({ success: false, message: 'La base de données est temporairement indisponible', code: 'DB_UNAVAILABLE' });
      return;
    }
  }

  logger.error('Unhandled error', err);
  res.status(500).json({ success: false, message: 'Erreur interne du serveur', code: 'INTERNAL' });
}