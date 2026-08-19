import { Response } from 'express';
import { Pagination } from '../types/entities';

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

export function paginated<T>(res: Response, data: T[], pagination: Pagination): void {
  res.status(200).json({ success: true, data, pagination });
}
