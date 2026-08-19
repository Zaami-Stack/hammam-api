import { Request, Response } from 'express';
import { createAuditLog } from '../repositories/audit.repo';
import {
  changeUserStatus,
  createUserAccount,
  listUsersPage,
  resetUserPassword,
  updateUserAccount,
  validateRole,
} from '../services/user.service';
import { created, ok, paginated } from '../utils/response';
import { parseInput } from '../utils/validate';
import { paginationSchema } from '../validators/query.validator';
import {
  createUserSchema,
  setPasswordSchema,
  setStatusSchema,
  updateUserSchema,
} from '../validators/user.validator';

export async function listUsers(req: Request, res: Response): Promise<void> {
  const pag = parseInput(paginationSchema, req.query);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const roleParam = typeof req.query.role === 'string' ? req.query.role : undefined;
  const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;

  const role = roleParam ? validateRole(roleParam) : undefined;
  const status =
    statusParam === 'active'
      ? 'active'
      : statusParam === 'inactive'
        ? 'inactive'
        : undefined;

  const result = await listUsersPage({ search, role, status }, pag.page, pag.limit);
  paginated(res, result.rows, result.pagination);
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const input = parseInput(createUserSchema, req.body);
  const user = await createUserAccount(input);
  await createAuditLog(req.user!.id, 'USER_CREATE', 'user', user.id, {
    role: user.role,
    email: user.email,
  });
  created(res, user);
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const input = parseInput(updateUserSchema, req.body);
  const user = await updateUserAccount(id, input);
  await createAuditLog(req.user!.id, 'USER_UPDATE', 'user', id, {
    changes: input,
  });
  ok(res, user);
}

export async function changeStatus(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const input = parseInput(setStatusSchema, req.body);
  const user = await changeUserStatus(id, input.is_active);
  await createAuditLog(req.user!.id, input.is_active ? 'USER_ACTIVATE' : 'USER_DEACTIVATE', 'user', id);
  ok(res, user);
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const input = parseInput(setPasswordSchema, req.body);
  await resetUserPassword(id, input.password);
  await createAuditLog(req.user!.id, 'USER_PASSWORD_RESET', 'user', id);
  ok(res, { message: 'Mot de passe mis à jour avec succès' });
}