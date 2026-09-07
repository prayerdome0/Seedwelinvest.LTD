import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { PRIVATE_UPLOAD_DIR, PUBLIC_UPLOAD_DIR, execute, queryOne } from '@/lib/db';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1920;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']);
const DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
]);

export type UploadKind = 'public' | 'private';

export interface StoredUpload {
  name: string;
  storedName: string;
  path: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
}

export class UploadError extends Error {}

function extensionFor(mime: string, original: string): string {
  const fromName = path.extname(original || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.zip'].includes(fromName)) {
    return fromName;
  }
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/zip': '.zip',
  };
  return map[mime] || '.bin';
}

/**
 * Validates and stores an uploaded file.
 * `public` files are served from /uploads (images are re-encoded and resized).
 * `private` files are written outside the web root and only reachable through
 * an authorised route handler.
 */
export async function storeUpload(file: File, kind: UploadKind, folder = 'general'): Promise<StoredUpload> {
  if (!file || typeof file === 'string') throw new UploadError('No file was received.');
  const mime = (file.type || 'application/octet-stream').toLowerCase();
  const size = file.size || 0;

  const isImage = IMAGE_TYPES.has(mime);
  const isDoc = DOC_TYPES.has(mime);
  if (!isImage && !isDoc) throw new UploadError('That file type is not allowed.');
  if (size > (isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES)) {
    throw new UploadError(`The file is too large. Maximum size is ${isImage ? '8 MB for images' : '15 MB for documents'}.`);
  }
  if (size === 0) throw new UploadError('The file appears to be empty.');

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeFolder = folder.replace(/[^\w-]/g, '') || 'general';
  const storedName = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}${extensionFor(mime, file.name)}`;

  const baseDir = kind === 'private' ? PRIVATE_UPLOAD_DIR : path.join(PUBLIC_UPLOAD_DIR, safeFolder);
  try {
    await fs.mkdir(baseDir, { recursive: true });
  } catch {
    throw new UploadError(
      'The server could not create the upload folder. This usually means the deployment is running on a read-only filesystem.',
    );
  }

  let width: number | undefined;
  let height: number | undefined;
  let finalBuffer = buffer;
  let finalName = storedName;

  if (isImage && mime !== 'image/svg+xml') {
    const pipeline = sharp(buffer, { failOn: 'none' }).rotate();
    const meta = await pipeline.metadata();
    width = meta.width;
    height = meta.height;
    if ((meta.width ?? 0) > MAX_IMAGE_WIDTH) {
      pipeline.resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true });
    }
    if (mime === 'image/png' || mime === 'image/gif') {
      finalBuffer = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      finalName = storedName.replace(/\.(png|gif)$/i, '.jpg');
    } else if (mime === 'image/jpeg') {
      finalBuffer = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    } else {
      finalBuffer = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      finalName = storedName.replace(/\.(webp|avif)$/i, '.jpg');
    }
    if ((meta.width ?? 0) > MAX_IMAGE_WIDTH) {
      const resized = await sharp(finalBuffer).metadata();
      width = resized.width;
      height = resized.height;
    }
  }

  try {
    await fs.writeFile(path.join(baseDir, finalName), finalBuffer);
  } catch {
    throw new UploadError(
      'The file could not be saved because the deployment filesystem is read-only. Uploads require a host with persistent storage.',
    );
  }

  return {
    name: file.name || finalName,
    storedName: finalName,
    path: kind === 'private' ? finalName : `/uploads/${safeFolder}/${finalName}`,
    mime,
    size: finalBuffer.byteLength,
    width,
    height,
  };
}

export async function deletePublicUpload(publicPath: string): Promise<void> {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const target = path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
  if (!target.startsWith(path.join(process.cwd(), 'public', 'uploads'))) return;
  try {
    await fs.unlink(target);
  } catch {
    /* already gone */
  }
}

/** Resolves a private file only for callers that already passed an authorisation check. */
export async function readPrivateFile(storedName: string): Promise<Buffer | null> {
  const safe = path.basename(storedName);
  const target = path.join(PRIVATE_UPLOAD_DIR, safe);
  if (!target.startsWith(PRIVATE_UPLOAD_DIR)) return null;
  try {
    return await fs.readFile(target);
  } catch {
    return null;
  }
}

/**
 * Central file-access rule for documents.
 * A user may open a document if they own it, uploaded it, have documents.view_any,
 * or it is shared with a role/department they belong to.
 */
export function userCanOpenDocument(
  doc: { owner_id: number | null; uploader_id: number | null; visibility: string; allowed_roles: string },
  user: { id: number; roleKey: string; departmentId: number | null; permissions: string[] },
): boolean {
  if (!doc) return false;
  if (doc.owner_id === user.id || doc.uploader_id === user.id) return true;
  if (user.permissions.includes('documents.view_any') || user.permissions.includes('system.super')) return true;
  switch (doc.visibility) {
    case 'public':
      return true;
    case 'internal':
      // Anyone who works here, but not clients or applicants.
      return user.roleKey !== 'client' && user.roleKey !== 'applicant';
    case 'role': {
      const allowed = (doc.allowed_roles || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      // An empty role list is private by default, never public.
      if (allowed.length === 0) return false;
      return allowed.includes(user.roleKey);
    }
    case 'department':
      return user.roleKey !== 'client' && user.roleKey !== 'applicant';
    case 'private':
    default:
      return false;
  }
}

export function recordDocument(input: {
  name: string;
  description?: string;
  category: string;
  storedName: string;
  mime: string;
  size: number;
  ownerId: number | null;
  uploaderId: number;
  relatedType?: string;
  relatedId?: number | null;
  visibility?: string;
  allowedRoles?: string;
  isSensitive?: boolean;
}): number {
  const info = execute(
    `INSERT INTO documents (name, description, category, stored_name, mime, size, owner_id, uploader_id, related_type,
      related_id, visibility, allowed_roles, is_sensitive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.description || '',
      input.category,
      input.storedName,
      input.mime,
      input.size,
      input.ownerId,
      input.uploaderId,
      input.relatedType || '',
      input.relatedId ?? null,
      input.visibility || 'private',
      input.allowedRoles || '',
      input.isSensitive ? 1 : 0,
    ],
  );
  return Number(info.lastInsertRowid);
}

export function getDocument(id: number) {
  return queryOne<{
    id: number;
    name: string;
    stored_name: string;
    mime: string;
    size: number;
    owner_id: number | null;
    uploader_id: number | null;
    visibility: string;
    allowed_roles: string;
    category: string;
  }>('SELECT * FROM documents WHERE id = ?', [id]);
}

/**
 * Builds a Content-Disposition header that is safe for non-ASCII file names:
 * an ASCII-only `filename` (so old clients work) plus a UTF-8 `filename*`.
 */
export function contentDisposition(name: string): string {
  const ascii = (name || 'download')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
  const safe = ascii || 'download';
  const encoded = encodeURIComponent(name || 'download').replace(/'/g, '%27');
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}
