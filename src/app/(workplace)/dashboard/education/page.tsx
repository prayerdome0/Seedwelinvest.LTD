import { PageHeader, Panel, EmptyRow, TableWrap } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { InlineActionForm, ActionForm } from '@/components/dashboard/forms';
import { saveCourseAction, deleteCourseAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function EducationPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requirePermission('education.manage', '/dashboard/education');
  const params = await searchParams;
  const editingId = Number(params.edit || 0);

  const courses = queryAll<{
    id: number;
    title: string;
    category: string;
    summary: string;
    description: string;
    outcomes: string;
    duration: string;
    level: string;
    mode: string;
    sort_order: number;
    is_published: number;
  }>('SELECT * FROM courses ORDER BY sort_order, title');

  const editing = editingId ? courses.find((c) => c.id === editingId) : undefined;

  return (
    <>
      <PageHeader title="Education & Skills" subtitle="Programmes shown on the public Education & Skills page." />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Panel padded={false}>
          <TableWrap className="rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Programme</th>
                  <th>Level</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <span className="block font-medium text-navy-900">{course.title}</span>
                      <span className="block text-xs text-navy-500">{course.category}</span>
                    </td>
                    <td className="text-xs text-navy-600">{course.level}</td>
                    <td className="text-xs text-navy-600">{course.duration}</td>
                    <td>
                      <Badge tone={course.is_published ? 'success' : 'neutral'}>{course.is_published ? 'published' : 'draft'}</Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <a
                          href={`/dashboard/education?edit=${course.id}`}
                          className="inline-flex items-center rounded-lg border border-navy-200 px-2.5 py-1 text-2xs font-medium text-navy-900 hover:bg-navy-50"
                        >
                          Edit
                        </a>
                        <InlineActionForm
                          action={deleteCourseAction}
                          fields={{ id: course.id }}
                          label="Delete"
                          confirm={`Delete “${course.title}”?`}
                          variant="ghost"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && <EmptyRow colSpan={5}>No programmes yet.</EmptyRow>}
              </tbody>
            </table>
          </TableWrap>
        </Panel>

        <Panel title={editing ? 'Edit programme' : 'Add a programme'} subtitle={editing ? editing.title : undefined}>
          <ActionForm
            action={saveCourseAction}
            submitLabel={editing ? 'Save programme' : 'Create programme'}
            formClassName="space-y-3"
            className="[&_form>button]:mt-2"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Title</span>
              <input name="title" defaultValue={editing?.title} className="field-input" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Category</span>
                <input name="category" defaultValue={editing?.category || 'Digital skills'} className="field-input" />
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Level</span>
                <select name="level" defaultValue={editing?.level || 'Beginner'} className="field-input">
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                  <option>All levels</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Duration</span>
                <input name="duration" defaultValue={editing?.duration} placeholder="e.g. 6 weeks" className="field-input" />
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Mode</span>
                <select name="mode" defaultValue={editing?.mode || 'In person'} className="field-input">
                  <option>In person</option>
                  <option>Online</option>
                  <option>Hybrid</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Summary</span>
              <textarea name="summary" rows={2} defaultValue={editing?.summary} className="field-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Description</span>
              <textarea name="description" rows={4} defaultValue={editing?.description} className="field-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Outcomes (one per line)</span>
              <textarea name="outcomes" rows={4} defaultValue={editing?.outcomes} className="field-input" />
            </label>
            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-2 text-xs text-navy-700">
                <input type="checkbox" name="is_published" value="1" defaultChecked={(editing?.is_published ?? 1) === 1} className="h-4 w-4 rounded border-navy-300" />
                Published
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-navy-700">
                Sort order{' '}
                <input type="number" name="sort_order" defaultValue={editing?.sort_order ?? 0} className="w-20 rounded-lg border border-navy-200 px-2 py-1 text-xs" />
              </label>
            </div>
          </ActionForm>
          {editing && (
            <a href="/dashboard/education" className="mt-4 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
              ← Add a new programme instead
            </a>
          )}
        </Panel>
      </div>
    </>
  );
}
