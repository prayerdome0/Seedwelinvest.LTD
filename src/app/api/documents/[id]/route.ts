import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/session';
import { readPrivateFile, getDocument, userCanOpenDocument, contentDisposition } from '@/lib/uploads';

/**
 * Authorised download of a document by id.
 * Ownership, uploader, role sharing or documents.view_any is required.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const doc = getDocument(Number(id));
  if (!doc) return new NextResponse('Not found', { status: 404 });

  const allowed = userCanOpenDocument(doc, {
    id: user.id,
    roleKey: user.roleKey,
    departmentId: user.departmentId,
    permissions: user.permissions,
  });
  if (!allowed) return new NextResponse('Forbidden', { status: 403 });

  const buffer = await readPrivateFile(doc.stored_name);
  if (!buffer) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': contentDisposition(doc.name),
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
