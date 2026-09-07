import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { ActionForm, InlineActionForm } from '@/components/dashboard/forms';
import { saveSimpleRecordAction, deleteSimpleRecordAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; editFaq?: string }>;
}) {
  await requirePermission('testimonials.manage', '/dashboard/content/testimonials');
  const params = await searchParams;

  const testimonials = queryAll<{ id: number; name: string; role: string; company: string; quote: string; rating: number; is_published: number }>(
    'SELECT * FROM testimonials ORDER BY sort_order, id',
  );
  const faqs = queryAll<{ id: number; question: string; answer: string; category: string; is_published: number }>(
    'SELECT * FROM faqs ORDER BY category, sort_order, id',
  );

  const editing = params.edit ? testimonials.find((t) => t.id === Number(params.edit)) : undefined;
  const editingFaq = params.editFaq ? faqs.find((f) => f.id === Number(params.editFaq)) : undefined;

  return (
    <>
      <PageHeader
        title="Testimonials & FAQs"
        subtitle="Client feedback shown on the home page, and answers to common questions."
        breadcrumb={[{ label: 'Website content', href: '/dashboard/content' }, { label: 'Testimonials & FAQs' }]}
        actions={
          <a href="/dashboard/content" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
            Back to content
          </a>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Panel title="Testimonials" subtitle={`${testimonials.length} item${testimonials.length === 1 ? '' : 's'}`}>
            <ul className="divide-y divide-navy-100">
              {testimonials.map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900">{item.name}</p>
                      <p className="text-xs text-navy-500">
                        {item.role}
                        {item.company ? ` · ${item.company}` : ''} · {item.rating}/5
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-navy-600">“{item.quote}”</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={item.is_published ? 'success' : 'neutral'}>{item.is_published ? 'live' : 'hidden'}</Badge>
                      <a
                        href={`/dashboard/content/testimonials?edit=${item.id}`}
                        className="inline-flex items-center rounded-lg border border-navy-200 px-2.5 py-1 text-2xs font-medium text-navy-900 hover:bg-navy-50"
                      >
                        Edit
                      </a>
                      <InlineActionForm
                        action={deleteSimpleRecordAction}
                        fields={{ entity: 'testimonial', id: item.id }}
                        label="Delete"
                        confirm={`Delete the testimonial from ${item.name}?`}
                        variant="ghost"
                      />
                    </div>
                  </div>
                </li>
              ))}
              {testimonials.length === 0 && <li className="py-3 text-sm text-navy-500">No testimonials yet.</li>}
            </ul>
          </Panel>

          <Panel title={editing ? 'Edit testimonial' : 'Add a testimonial'}>
            <ActionForm action={saveSimpleRecordAction} submitLabel={editing ? 'Save testimonial' : 'Add testimonial'} formClassName="space-y-3">
              <input type="hidden" name="entity" value="testimonial" />
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <input name="name" placeholder="Person’s name" defaultValue={editing?.name} className="field-input" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="role" placeholder="Their role" defaultValue={editing?.role} className="field-input" />
                <input name="company" placeholder="Company" defaultValue={editing?.company} className="field-input" />
              </div>
              <textarea name="quote" rows={3} placeholder="What they said…" defaultValue={editing?.quote} className="field-input" required />
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-navy-700">
                  Rating
                  <select name="rating" defaultValue={editing?.rating ?? 5} className="rounded-lg border border-navy-200 px-2 py-1 text-xs">
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-navy-700">
                  <input type="checkbox" name="is_published" value="1" defaultChecked={(editing?.is_published ?? 1) === 1} className="h-4 w-4 rounded border-navy-300" />
                  Published
                </label>
              </div>
            </ActionForm>
            {editing && (
              <a href="/dashboard/content/testimonials" className="mt-4 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
                ← Add a new testimonial instead
              </a>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Frequently asked questions" subtitle={`${faqs.length} question${faqs.length === 1 ? '' : 's'}`}>
            <ul className="divide-y divide-navy-100">
              {faqs.map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900">{item.question}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-navy-600">{item.answer}</p>
                      <p className="mt-0.5 text-2xs text-navy-400">{item.category}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={item.is_published ? 'success' : 'neutral'}>{item.is_published ? 'live' : 'hidden'}</Badge>
                      <a
                        href={`/dashboard/content/testimonials?editFaq=${item.id}`}
                        className="inline-flex items-center rounded-lg border border-navy-200 px-2.5 py-1 text-2xs font-medium text-navy-900 hover:bg-navy-50"
                      >
                        Edit
                      </a>
                      <InlineActionForm
                        action={deleteSimpleRecordAction}
                        fields={{ entity: 'faq', id: item.id }}
                        label="Delete"
                        confirm="Delete this question?"
                        variant="ghost"
                      />
                    </div>
                  </div>
                </li>
              ))}
              {faqs.length === 0 && <li className="py-3 text-sm text-navy-500">No FAQs yet.</li>}
            </ul>
          </Panel>

          <Panel title={editingFaq ? 'Edit question' : 'Add a question'}>
            <ActionForm action={saveSimpleRecordAction} submitLabel={editingFaq ? 'Save question' : 'Add question'} formClassName="space-y-3">
              <input type="hidden" name="entity" value="faq" />
              {editingFaq && <input type="hidden" name="id" value={editingFaq.id} />}
              <input name="question" placeholder="Question" defaultValue={editingFaq?.question} className="field-input" required />
              <textarea name="answer" rows={4} placeholder="Answer" defaultValue={editingFaq?.answer} className="field-input" required />
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-navy-700">
                  Category
                  <input name="category" defaultValue={editingFaq?.category || 'General'} className="rounded-lg border border-navy-200 px-2 py-1 text-xs" />
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-navy-700">
                  <input type="checkbox" name="is_published" value="1" defaultChecked={(editingFaq?.is_published ?? 1) === 1} className="h-4 w-4 rounded border-navy-300" />
                  Published
                </label>
              </div>
            </ActionForm>
            {editingFaq && (
              <a href="/dashboard/content/testimonials" className="mt-4 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
                ← Add a new question instead
              </a>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
