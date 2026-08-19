import { ResultSetHeader } from 'mysql2/promise';
import { getPool } from '../db/pool';

export type AuditDetails = Record<string, unknown>;

export async function createAuditLog(
  actorId: number,
  action: string,
  entityType: string,
  entityId: string | number | null,
  details?: AuditDetails
): Promise<void> {
  await getPool().query<ResultSetHeader>(
    'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [actorId, action, entityType, entityId === null ? null : String(entityId), details ? JSON.stringify(details) : null]
  );
}