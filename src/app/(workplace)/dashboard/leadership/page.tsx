import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ActionForm, InlineActionForm } from '@/components/dashboard/forms';
import { saveSimpleRecordAction, deleteSimpleRecordAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function LeadershipPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requirePermission('leadership.manage', '/dashboard/leadership');
  const params = await searchParams;

  const leaders = queryAll<{
    id: number;
    name: string;
    title: string;
    short_bio: string;
    bio: string;
    message: string;
    responsibilities: string;
    focus: string;
    email: string;
    linkedin: string;
    image_path: string | null;
    is_published: number;
    sort_order: number;
  }>('SELECT * FROM leadership ORDER BY sort_order, id');

  const editing = params.edit ? leaders.find((l) => l.id === Number(params.edit)) : undefined;

  return (
    <>
      <PageHeader
        title="Leadership"
        subtitle="Profiles shown on the About page and the home page leadership section."
        breadcrumb={[{ label: 'Website content', href: '/dashboard/content' }, { label: 'Leadership' }]}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Panel padded={false}>
          <ul className="divide-y divide-navy-100">
            {leaders.map((leader) => (
              <li key={leader.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={leader.name} src={leader.image_path} size={44} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-navy-900">{leader.name}</span>
                    <span className="block truncate text-xs text-navy-500">{leader.title}</span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={leader.is_published ? 'success' : 'neutral'}>{leader.is_published ? 'live' : 'hidden'}</Badge>
                  <a
                    href={`/dashboard/leadership?edit=${leader.id}`}
                    className="inline-flex items-center rounded-lg border border-navy-200 px-2.5 py-1 text-2xs font-medium text-navy-900 hover:bg-navy-50"
                  >
                    Edit
                  </a>
                  <InlineActionForm
                    action={deleteSimpleRecordAction}
                    fields={{ entity: 'leader', id: leader.id }}
                    label="Delete"
                    confirm={`Delete the profile for ${leader.name}?`}
                    variant="ghost"
                  />
                </span>
              </li>
            ))}
            {leaders.length === 0 && <li className="p-6 text-center text-sm text-navy-500">No leadership profiles yet.</li>}
          </ul>
        </Panel>

        <Panel title={editing ? 'Edit profile' : 'Add a leader'} subtitle={editing ? editing.name : undefined}>
          <ActionForm
            action={saveSimpleRecordAction}
            submitLabel={editing ? 'Save profile' : 'Add profile'}
            formClassName="space-y-3"
          >
            <input type="hidden" name="entity" value="leader" />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Full name</span>
              <input name="name" defaultValue={editing?.name} className="field-input" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Title / role</span>
                <input name="title" defaultValue={editing?.title} className="field-input" placeholder="e.g. Founder & Managing Director" />
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Focus</span>
                <input name="focus" defaultValue={editing?.focus} className="field-input" placeholder="e.g. Operations, Talent and Skills" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Short bio</span>
              <textarea name="short_bio" rows={2} defaultValue={editing?.short_bio} className="field-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Full bio</span>
              <textarea name="bio" rows={5} defaultValue={editing?.bio} className="field-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Message (optional)</span>
              <textarea name="message" rows={4} defaultValue={editing?.message} className="field-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">
                Areas of responsibility (one per line)
              </span>
              <textarea name="responsibilities" rows={4} defaultValue={editing?.responsibilities} className="field-input" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Email</span>
                <input name="email" type="email" defaultValue={editing?.email} className="field-input" />
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">LinkedIn URL</span>
                <input name="linkedin" type="url" defaultValue={editing?.linkedin} className="field-input" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Photograph</span>
              <input type="hidden" name="existing_image" value={editing?.image_path || ''} />
              <input type="file" name="image" accept="image/*" className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800" />
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-navy-700">
              <input type="checkbox" name="is_published" value="1" defaultChecked={(editing?.is_published ?? 1) === 1} className="h-4 w-4 rounded border-navy-300" />
              Published
            </label>
          </ActionForm>
          {editing && (
            <a href="/dashboard/leadership" className="mt-4 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
              ← Add a new profile instead
            </a>
          )}
        </Panel>
      </div>
    </>
  );
}
