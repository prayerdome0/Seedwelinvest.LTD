import { NextResponse } from 'next/server';
import path from 'node:path';
import { getUser } from '@/lib/auth/session';
import { queryOne } from '@/lib/db';
import { readPrivateFile, userCanOpenDocument, contentDisposition } from '@/lib/uploads';

/**
 * Streams a privately stored file.
 *
 * The file name alone is never enough: every request is checked against the
 * document's owner/visibility, or against the task, submission or project the
 * file belongs to. Changing the ID in the URL does not grant access.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const user = await getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { name } = await params;
  const storedName = path.basename(decodeURIComponent(name || ''));
  if (!storedName || storedName.includes('..')) return new NextResponse('Not found', { status: 404 });

  const admin = user.permissions.includes('documents.view_any') || user.permissions.includes('system.super');

  const document = queryOne<{
    owner_id: number | null;
    uploader_id: number | null;
    visibility: string;
    allowed_roles: string;
    mime: string;
    name: string;
  }>('SELECT owner_id, uploader_id, visibility, allowed_roles, mime, name FROM documents WHERE stored_name = ?', [storedName]);

  let allowed = false;
  let downloadName = storedName;

  if (document) {
    allowed = userCanOpenDocument(document, {
      id: user.id,
      roleKey: user.roleKey,
      departmentId: user.departmentId,
      permissions: user.permissions,
    });
    downloadName = document.name || storedName;
  } else {
    const attachment = queryOne<{ task_id: number; name: string }>('SELECT task_id, name FROM task_attachments WHERE path = ?', [storedName]);
    const submission = queryOne<{ task_id: number }>('SELECT task_id FROM task_submissions WHERE file_path = ?', [storedName]);
    const projectFile = queryOne<{ project_id: number; name: string; is_client_visible: number }>(
      'SELECT project_id, name, is_client_visible FROM project_files WHERE path = ?',
      [storedName],
    );

    if (attachment) {
      downloadName = attachment.name;
      allowed =
        admin ||
        !!queryOne('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?', [attachment.task_id, user.id]) ||
        !!queryOne('SELECT 1 FROM tasks WHERE id = ? AND created_by = ?', [attachment.task_id, user.id]) ||
        user.permissions.includes('tasks.approve');
    } else if (submission) {
      allowed =
        admin ||
        !!queryOne('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?', [submission.task_id, user.id]) ||
        !!queryOne('SELECT 1 FROM tasks WHERE id = ? AND created_by = ?', [submission.task_id, user.id]) ||
        user.permissions.includes('tasks.approve');
    } else if (projectFile) {
      downloadName = projectFile.name;
      allowed =
        admin ||
        !!queryOne('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?', [projectFile.project_id, user.id]) ||
        (projectFile.is_client_visible === 1 && (user.permissions.includes('projects.view_assigned') || user.roleKey === 'client'));
    } else if (admin) {
      allowed = true;
    }
  }

  if (!allowed) return new NextResponse('Forbidden', { status: 403 });

  const buffer = await readPrivateFile(storedName);
  if (!buffer) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': contentDisposition(downloadName),
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
