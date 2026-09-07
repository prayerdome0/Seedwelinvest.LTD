import { Megaphone } from 'lucide-react';
import { PageHeader, Panel, EmptyRow, TableWrap } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { ActionForm, InlineActionForm } from '@/components/dashboard/forms';
import { saveAnnouncementAction, deleteAnnouncementAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requirePermission('announcements.manage', '/dashboard/announcements');
  const params = await searchParams;
  const editingId = Number(params.edit || 0);

  const announcements = queryAll<{
    id: number;
    title: string;
    body: string;
    audience: string;
    priority: string;
    is_published: number;
    published_at: string | null;
    author: string | null;
  }>(
    `SELECT a.id, a.title, a.body, a.audience, a.priority, a.is_published, a.published_at,
            (SELECT TRIM(first_name || ' ' || last_name) FROM users u WHERE u.id = a.author_id) AS author
       FROM announcements a ORDER BY a.published_at DESC`,
  );

  const editing = editingId ? announcements.find((a) => a.id === editingId) : undefined;

  return (
    <>
      <PageHeader title="Announcements" subtitle="Post an update for staff, clients or applicants." />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Panel padded={false}>
          <TableWrap className="rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Announcement</th>
                  <th>Audience</th>
                  <th>Published</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {announcements.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="block font-medium text-navy-900">{item.title}</span>
                      <span className="mt-0.5 line-clamp-1 block text-xs text-navy-500">{item.body}</span>
                    </td>
                    <td className="text-xs text-navy-600">{item.audience}</td>
                    <td className="whitespace-nowrap text-xs text-navy-500">
                      {item.published_at ? formatDate(item.published_at) : '—'}
                      {item.author ? ` · ${item.author}` : ''}
                    </td>
                    <td>
                      <Badge tone={item.is_published ? 'success' : 'neutral'}>{item.is_published ? 'published' : 'draft'}</Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <a
                          href={`/dashboard/announcements?edit=${item.id}`}
                          className="inline-flex items-center rounded-lg border border-navy-200 px-2.5 py-1 text-2xs font-medium text-navy-900 hover:bg-navy-50"
                        >
                          Edit
                        </a>
                        <InlineActionForm
                          action={deleteAnnouncementAction}
                          fields={{ id: item.id }}
                          label="Delete"
                          confirm={`Delete “${item.title}”?`}
                          variant="ghost"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {announcements.length === 0 && (
                  <EmptyRow colSpan={5}>
                    <span className="inline-flex items-center gap-2">
                      <Megaphone size={16} aria-hidden /> No announcements yet.
                    </span>
                  </EmptyRow>
                )}
              </tbody>
            </table>
          </TableWrap>
        </Panel>

        <Panel title={editing ? 'Edit announcement' : 'New announcement'} subtitle={editing ? editing.title : 'Publishing notifies the audience immediately.'}>
          <ActionForm action={saveAnnouncementAction} submitLabel={editing ? 'Save announcement' : 'Publish announcement'} formClassName="space-y-3">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Title</span>
              <input name="title" defaultValue={editing?.title} className="field-input" required />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Message</span>
              <textarea name="body" rows={4} defaultValue={editing?.body} className="field-input" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Audience</span>
                <select name="audience" defaultValue={editing?.audience || 'staff'} className="field-input">
                  <option value="staff">Staff</option>
                  <option value="clients">Clients</option>
                  <option value="applicants">Applicants</option>
                  <option value="all">Everyone</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Priority</span>
                <select name="priority" defaultValue={editing?.priority || 'normal'} className="field-input">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-navy-700">
              <input type="checkbox" name="is_published" value="1" defaultChecked={(editing?.is_published ?? 1) === 1} className="h-4 w-4 rounded border-navy-300" />
              Published and visible
            </label>
          </ActionForm>
          {editing && (
            <a href="/dashboard/announcements" className="mt-4 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
              ← Write a new announcement instead
            </a>
          )}
        </Panel>
      </div>
    </>
  );
}
