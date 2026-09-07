import 'server-only';
import { execute, queryAll } from '@/lib/db';
import { clientIp, userAgent } from '@/lib/auth/session';

export interface AuditInput {
  actorId: number | null;
  actorName: string;
  action: string;
  entityType?: string;
  entityId?: number | null;
  entityLabel?: string;
  field?: string;
  previousValue?: string;
  newValue?: string;
}

/**
 * Records an administrative action. Never throws — a failure to log must not
 * break the operation being logged.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    execute(
      `INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, entity_label, field,
        previous_value, new_value, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.actorId,
        input.actorName,
        input.action,
        input.entityType || '',
        input.entityId ?? null,
        input.entityLabel || '',
        input.field || '',
        input.previousValue ?? '',
        input.newValue ?? '',
        await clientIp(),
        await userAgent(),
      ],
    );
  } catch {
    /* logging must never break the app */
  }
}

/** Compares two records and writes one audit entry per changed field. */
export async function logChanges(
  actor: { id: number; fullName: string },
  action: string,
  entity: { type: string; id: number | null; label: string },
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  watched: string[],
): Promise<void> {
  for (const key of watched) {
    const prev = String(before[key] ?? '');
    const next = String(after[key] ?? '');
    if (prev === next) continue;
    await logAudit({
      actorId: actor.id,
      actorName: actor.fullName,
      action,
      entityType: entity.type,
      entityId: entity.id,
      entityLabel: entity.label,
      field: key,
      previousValue: prev,
      newValue: next,
    });
  }
}

export interface AuditEntry {
  id: number;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_label: string;
  field: string;
  previous_value: string;
  new_value: string;
  ip: string;
  created_at: string;
}

export function recentAudit(limit = 100): AuditEntry[] {
  return queryAll<AuditEntry>('SELECT * FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ?', [limit]);
}
