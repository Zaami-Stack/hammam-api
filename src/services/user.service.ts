import bcrypt from 'bcrypt';
import { createUser, countActiveAdmins, findUserByEmail, findUserById, listUsers, setUserActive, setUserPassword, updateUser, UserListFilters } from '../repositories/user.repo';
import { Role, SafeUser, User } from '../types/entities';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors';
import { toSafeUser } from '../middleware/authenticate';
import { Pagination } from '../types/entities';

const BCRYPT_ROUNDS = 10;

export async function createUserAccount(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<SafeUser> {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new ConflictError("Un utilisateur avec cet e-mail existe déjà");
  }
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const user = await createUser({
    name: data.name.trim(),
    email: data.email,
    password_hash: passwordHash,
    role: data.role,
  });
  return toSafeUser(user);
}

async function assertNotLastActiveAdmin(
  target: User,
  nextRole: Role,
  nextActive: boolean
): Promise<void> {
  if (target.role !== 'ADMIN') return;
  const staysAdmin = nextRole === 'ADMIN' && nextActive;
  if (staysAdmin) return;
  const activeAdmins = await countActiveAdmins();
  if (activeAdmins <= 1) {
    throw new ConflictError('Impossible de désactiver ou rétrograder le dernier administrateur actif');
  }
}

export async function updateUserAccount(
  id: number,
  fields: { name?: string; email?: string; role?: Role }
): Promise<SafeUser> {
  const user = await findUserById(id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');

  if (fields.email && fields.email.toLowerCase() !== user.email) {
    const existing = await findUserByEmail(fields.email);
    if (existing && existing.id !== id) {
throw new ConflictError("Un utilisateur avec cet e-mail existe déjà");
    }
  }

  if (fields.role && fields.role !== user.role) {
    await assertNotLastActiveAdmin(user, fields.role, user.is_active);
  }

  const updated = await updateUser(id, {
    name: fields.name?.trim(),
    email: fields.email,
    role: fields.role,
  });
  if (!updated) throw new NotFoundError('Utilisateur introuvable');
  return toSafeUser(updated);
}

export async function changeUserStatus(id: number, isActive: boolean): Promise<SafeUser> {
  const user = await findUserById(id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');
  if (user.is_active === isActive) {
    return toSafeUser(user);
  }
  await assertNotLastActiveAdmin(user, user.role, isActive);
  await setUserActive(id, isActive);
  const updated = await findUserById(id);
  return toSafeUser(updated as User);
}

export async function resetUserPassword(id: number, password: string): Promise<void> {
  const user = await findUserById(id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await setUserPassword(id, passwordHash);
}

export function validateRole(value: string): Role {
  if (value !== 'ADMIN' && value !== 'RECEPTION') {
    throw new BadRequestError('Rôle invalide');
  }
  return value;
}

export async function listUsersPage(
  filters: UserListFilters,
  page: number,
  limit: number
): Promise<{ rows: SafeUser[]; pagination: Pagination }> {
  const offset = (page - 1) * limit;
  const result = await listUsers(filters, offset, limit);
  return {
    rows: result.rows.map(toSafeUser),
    pagination: result.pagination,
  };
}