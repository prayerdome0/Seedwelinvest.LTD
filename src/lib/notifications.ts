import 'server-only';
import { execute, queryAll, queryOne } from '@/lib/db';

export type NotificationType =
  | 'system'
  | 'task_assigned'
  | 'task_due'
  | 'task_overdue'
  | 'task_submitted'
  | 'changes_requested'
  | 'work_approved'
  | 'application_new'
  | 'application_status'
  | 'service_request'
  | 'message'
  | 'announcement'
  | 'invitation';

export interface NotificationInput {
  userId: number;
  type: NotificationType | string;
  title: string;
  body?: string;
  href?: string;
  actorId?: number | null;
}

export function notify(input: NotificationInput): void {
  if (!input.userId) return;
  execute('INSERT INTO notifications (user_id, type, title, body, href, actor_id) VALUES (?, ?, ?, ?, ?, ?)', [
    input.userId,
    input.type,
    input.title,
    input.body || '',
    input.href || '',
    input.actorId ?? null,
  ]);
}

export function notifyMany(userIds: number[], input: Omit<NotificationInput, 'userId'>): void {
  for (const id of new Set(userIds.filter(Boolean))) notify({ ...input, userId: id });
}

/** Sends a notification to every active user holding one of the given permissions. */
export function notifyPermission(
  permission: string,
  input: Omit<NotificationInput, 'userId'>,
  excludeUserId?: number,
): void {
  const rows = queryAll<{ id: number }>(
    `SELECT DISTINCT u.id FROM users u
      WHERE u.status = 'active'
        AND EXISTS (SELECT 1 FROM role_permissions rp
                     WHERE (rp.role_key = u.role_key OR rp.role_key IN (SELECT role_key FROM user_roles WHERE user_id = u.id))
                       AND rp.permission = ?)`,
    [permission],
  );
  for (const r of rows) {
    if (excludeUserId && r.id === excludeUserId) continue;
    notify({ ...input, userId: r.id });
  }
}

export interface NotificationRow {
  id: number;
  type: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
}

export function notificationsFor(userId: number, limit = 30): NotificationRow[] {
  return queryAll<NotificationRow>(
    'SELECT id, type, title, body, href, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?',
    [userId, limit],
  );
}

export function unreadCount(userId: number): number {
  const row = queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL', [
    userId,
  ]);
  return row ? Number(row.c) : 0;
}

export function markAllRead(userId: number): void {
  execute("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL", [userId]);
}

export function markRead(userId: number, id: number): void {
  execute("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?", [id, userId]);
}
