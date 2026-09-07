import Link from 'next/link';
import { Bell } from 'lucide-react';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { notificationsFor, markAllRead } from '@/lib/notifications';
import { timeAgo } from '@/lib/utils';
import { MarkAllReadButton } from '@/components/dashboard/MarkAllReadButton';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ mark?: string }> }) {
  const user = await requireUser('/dashboard/notifications');
  const params = await searchParams;
  if (params.mark === 'all') markAllRead(user.id);

  const items = notificationsFor(user.id, 100);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${items.filter((i) => !i.read_at).length} unread`}
        actions={<MarkAllReadButton />}
      />

      <Panel padded={false}>
        <ul className="divide-y divide-navy-100">
          {items.map((item) => (
            <li key={item.id} className={item.read_at ? '' : 'bg-brand-50/40'}>
              <Link href={item.href || '#'} className="flex items-start gap-3 p-4 transition-colors hover:bg-navy-50/60">
                <span
                  className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    item.read_at ? 'bg-navy-50 text-navy-400' : 'bg-brand-100 text-brand-700'
                  }`}
                  aria-hidden
                >
                  <Bell size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-navy-900">{item.title}</span>
                    <span className="shrink-0 text-2xs text-navy-400">{timeAgo(item.created_at)}</span>
                  </span>
                  {item.body && <span className="mt-0.5 block text-xs leading-relaxed text-navy-600">{item.body}</span>}
                </span>
              </Link>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-4 py-12 text-center text-sm text-navy-500">No notifications yet.</li>
          )}
        </ul>
      </Panel>
    </>
  );
}
