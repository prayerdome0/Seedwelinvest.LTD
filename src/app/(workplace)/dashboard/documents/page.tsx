import { FileText, Lock } from 'lucide-react';
import { PageHeader, Panel, EmptyRow, TableWrap, FilterBar, FilterField } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatFileSize } from '@/lib/utils';
import { DOCUMENT_CATEGORIES } from '@/lib/rbac';
import { ActionForm, InlineActionForm } from '@/components/dashboard/forms';
import { uploadDocumentAction, deleteDocumentAction } from '@/app/actions/workplace';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const user = await requirePermission('documents.upload', '/dashboard/documents');
  const params = await searchParams;
  const q = (params.q || '').trim();
  const category = params.category || '';

  const where: string[] = [];
  const args: unknown[] = [];
  if (category) {
    where.push('d.category = ?');
    args.push(category);
  }
  if (q) {
    where.push('(d.name LIKE ? OR d.description LIKE ?)');
    args.push(`%${q}%`, `%${q}%`);
  }

  // Visibility is enforced in SQL, not in the interface.
  const whereSql = where.length ? `AND ${where.join(' AND ')}` : '';
  const visibilitySql = `
    AND (
      d.owner_id = ? OR d.uploader_id = ? OR d.visibility = 'public' OR d.visibility = 'internal'
      OR (d.visibility = 'role' AND (d.allowed_roles LIKE '%' || ? || '%'))
      OR ? = 1
    )`;

  const documents = queryAll<{
    id: number;
    name: string;
    description: string;
    category: string;
    size: number;
    visibility: string;
    created_at: string;
    uploader: string | null;
  }>(
    `SELECT d.id, d.name, d.description, d.category, d.size, d.visibility, d.created_at,
            (SELECT TRIM(first_name || ' ' || last_name) FROM users u WHERE u.id = d.uploader_id) AS uploader
       FROM documents d
      WHERE 1 = 1 ${visibilitySql} ${whereSql}
      ORDER BY d.created_at DESC LIMIT 100`,
    [user.id, user.id, user.roleKey, user.permissions.includes('documents.view_any') || user.permissions.includes('system.super') ? 1 : 0, ...args],
  );

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Secure, access-controlled storage. Only files you are allowed to open are listed here."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <FilterBar>
            <FilterField label="Search">
              <input name="q" defaultValue={q} placeholder="File name or description…" className="field-input" />
            </FilterField>
            <FilterField label="Category">
              <select name="category" defaultValue={category} className="field-input">
                <option value="">All categories</option>
                {DOCUMENT_CATEGORIES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <button type="submit" className="inline-flex h-[42px] items-center rounded-xl bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800">
              Filter
            </button>
          </FilterBar>

          <Panel padded={false}>
            <TableWrap className="rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Category</th>
                    <th>Visibility</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <a href={`/api/documents/${doc.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                          {doc.name}
                        </a>
                        {doc.description && <p className="mt-0.5 text-xs text-navy-500">{doc.description}</p>}
                      </td>
                      <td className="text-xs text-navy-600">{doc.category.replace(/_/g, ' ')}</td>
                      <td>
                        <Badge tone={doc.visibility === 'public' ? 'success' : doc.visibility === 'private' ? 'neutral' : 'warning'}>
                          {doc.visibility}
                        </Badge>
                      </td>
                      <td className="text-xs text-navy-600">{formatFileSize(doc.size)}</td>
                      <td className="whitespace-nowrap text-xs text-navy-500">
                        {formatDate(doc.created_at)}
                        {doc.uploader ? ` · ${doc.uploader}` : ''}
                      </td>
                      <td className="text-right">
                        <InlineActionForm
                          action={deleteDocumentAction}
                          fields={{ id: doc.id }}
                          label="Delete"
                          confirm={`Delete “${doc.name}”?`}
                          variant="ghost"
                        />
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <EmptyRow colSpan={6}>
                      <span className="inline-flex items-center gap-2">
                        <FileText size={16} aria-hidden /> No documents to show.
                      </span>
                    </EmptyRow>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Upload a document">
            <ActionForm
              action={uploadDocumentAction}
              submitLabel="Upload document"
              formClassName="space-y-3"
            >
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">File</span>
                <input type="file" name="file" required className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800" />
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Name</span>
                <input name="name" className="field-input" placeholder="Optional — defaults to the file name" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Category</span>
                  <select name="category" defaultValue="company_document" className="field-input">
                    {DOCUMENT_CATEGORIES.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Who can access</span>
                  <select name="visibility" defaultValue="private" className="field-input">
                    <option value="private">Only me and managers</option>
                    <option value="role">Selected roles</option>
                    <option value="internal">All staff</option>
                    <option value="public">Anyone signed in</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">
                  Allowed roles (comma separated, when visibility is “Selected roles”)
                </span>
                <input name="allowed_roles" className="field-input" placeholder="manager,hr,director" />
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Description</span>
                <textarea name="description" rows={2} className="field-input" />
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-navy-700">
                <input type="checkbox" name="is_sensitive" value="1" className="h-4 w-4 rounded border-navy-300" />
                Sensitive (contracts, IDs, payroll)
              </label>
            </ActionForm>
          </Panel>

          <div className="rounded-2xl border border-navy-100 bg-mist p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-navy-600">
              <Lock size={14} className="mt-0.5 shrink-0 text-navy-400" aria-hidden />
              Files are stored outside the public folder. Every download is checked against ownership, role and
              department — changing the ID in the URL will not open a file you cannot access.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
