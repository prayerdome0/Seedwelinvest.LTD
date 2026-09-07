import { ImageIcon } from 'lucide-react';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { formatDate, formatFileSize } from '@/lib/utils';
import { ActionForm, InlineActionForm } from '@/components/dashboard/forms';
import { uploadMediaAction, deleteMediaAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  await requirePermission('media.manage', '/dashboard/media');

  const media = queryAll<{ id: number; name: string; path: string; mime: string; size: number; width: number | null; height: number | null; alt: string; folder: string; created_at: string }>(
    'SELECT * FROM media ORDER BY created_at DESC LIMIT 200',
  );

  const folders = Array.from(new Set(media.map((item) => item.folder)));

  return (
    <>
      <PageHeader title="Media library" subtitle="Images used across the website. Uploads are resized and compressed automatically." />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          {folders.length === 0 ? (
            <Panel>
              <p className="py-6 text-center text-sm text-navy-500">No files uploaded yet.</p>
            </Panel>
          ) : (
            folders.map((folder) => (
              <Panel key={folder} title={folder} subtitle={`${media.filter((m) => m.folder === folder).length} file(s)`} padded={false}>
                <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {media
                    .filter((item) => item.folder === folder)
                    .map((item) => (
                      <li key={item.id} className="overflow-hidden rounded-xl border border-navy-100">
                        <div className="relative aspect-[16/10] bg-navy-50">
                          {item.mime.startsWith('image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.path} alt={item.alt || item.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="flex h-full items-center justify-center text-navy-300">
                              <ImageIcon size={22} aria-hidden />
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-xs font-medium text-navy-900">{item.name}</p>
                          <p className="mt-0.5 text-2xs text-navy-500">
                            {formatFileSize(item.size)}
                            {item.width ? ` · ${item.width}×${item.height}` : ''} · {formatDate(item.created_at)}
                          </p>
                          <p className="mt-1 truncate font-mono text-2xs text-navy-400">{item.path}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <a href={item.path} target="_blank" rel="noopener noreferrer" className="text-2xs font-medium text-brand-600 hover:text-brand-700">
                              Open
                            </a>
                            <InlineActionForm
                              action={deleteMediaAction}
                              fields={{ id: item.id }}
                              label="Delete"
                              confirm="Delete this file from the media library?"
                              variant="ghost"
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </Panel>
            ))
          )}
        </div>

        <Panel title="Upload images">
          <ActionForm action={uploadMediaAction} submitLabel="Upload files" formClassName="space-y-3">
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Files</span>
              <input type="file" name="files" multiple accept="image/*" required className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800" />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Folder</span>
              <select name="folder" defaultValue="general" className="field-input">
                <option value="general">General</option>
                <option value="Services">Services</option>
                <option value="Content">Content</option>
                <option value="Projects">Projects</option>
                <option value="Leadership">Leadership</option>
                <option value="Education">Education</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Alt text</span>
              <input name="alt" className="field-input" placeholder="Describe the image for screen readers" />
            </label>
          </ActionForm>
          <p className="mt-3 text-2xs leading-relaxed text-navy-500">
            Images are resized to a maximum width of 1920 pixels and re-encoded on upload, so pages stay fast on mobile
            data.
          </p>
        </Panel>
      </div>
    </>
  );
}
