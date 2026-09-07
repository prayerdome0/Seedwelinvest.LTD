import Link from 'next/link';
import { FileEdit } from 'lucide-react';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { ContentBlockForm } from '@/components/dashboard/ContentBlockForm';

export const dynamic = 'force-dynamic';

const PAGE_GROUPS: { page: string; label: string; description: string }[] = [
  { page: 'home', label: 'Home page', description: 'Hero, intro, divisions, why-us, process, stats and calls to action.' },
  { page: 'about', label: 'About page', description: 'Who we are, our story, mission, vision and values.' },
  { page: 'what-we-do', label: 'What We Do', description: 'Intro copy and the six divisions.' },
  { page: 'services', label: 'Services page', description: 'Heading and introduction for the services index.' },
  { page: 'careers', label: 'Careers page', description: 'Heading and introduction for the careers page.' },
  { page: 'opportunities', label: 'Opportunities page', description: 'Heading and public disclaimer text.' },
  { page: 'education', label: 'Education & Skills', description: 'Heading and introduction for the education page.' },
  { page: 'projects', label: 'Projects page', description: 'Heading and introduction for the portfolio.' },
  { page: 'footer', label: 'Footer', description: 'Registration note and the investment disclaimer shown site-wide.' },
];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  await requirePermission('content.manage', '/dashboard/content');
  const params = await searchParams;

  const blocks = queryAll<{ key: string; page: string; title: string; subtitle: string; body: string; extra: string; image_path: string | null; updated_at: string }>(
    'SELECT key, page, title, subtitle, body, extra, image_path, updated_at FROM content_blocks ORDER BY page, key',
  );

  const editing = params.key ? queryOne<{ key: string; page: string; title: string; subtitle: string; body: string; extra: string; image_path: string | null }>(
    'SELECT key, page, title, subtitle, body, extra, image_path FROM content_blocks WHERE key = ?',
    [params.key],
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Website content"
        subtitle="Edit the words and images on every public page. No developer needed — changes go live within seconds."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/content/testimonials" className="inline-flex items-center rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
              Testimonials & FAQs
            </Link>
            <Link href="/dashboard/leadership" className="inline-flex items-center rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
              Leadership
            </Link>
            <Link href="/dashboard/media" className="inline-flex items-center rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
              Media library
            </Link>
          </div>
        }
      />

      {editing ? (
        <div className="max-w-3xl">
          <Panel title={editing.key} subtitle={`Editing ${editing.page} content block`}>
            <ContentBlockForm
              defaults={{
                key: editing.key,
                page: editing.page,
                title: editing.title,
                subtitle: editing.subtitle,
                body: editing.body,
                extra: editing.extra,
                image_path: editing.image_path,
              }}
            />
          </Panel>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {PAGE_GROUPS.map((group) => {
            const items = blocks.filter((block) => block.page === group.page);
            return (
              <Panel key={group.page} title={group.label} subtitle={group.description} action={<span className="chip">{items.length} blocks</span>}>
                {items.length === 0 ? (
                  <p className="text-sm text-navy-500">No editable blocks for this page yet.</p>
                ) : (
                  <ul className="divide-y divide-navy-100">
                    {items.map((block) => (
                      <li key={block.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-navy-900">{block.title || block.key}</span>
                          <span className="block truncate text-2xs text-navy-400">{block.key}</span>
                        </span>
                        <Link
                          href={`/dashboard/content?key=${encodeURIComponent(block.key)}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-900 hover:bg-navy-50"
                        >
                          <FileEdit size={13} aria-hidden /> Edit
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
