import Link from 'next/link';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { ConversationForm } from '@/components/dashboard/ConversationForm';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const user = await requirePermission('messages.use', '/dashboard/messages');

  const conversations = queryAll<{
    id: number;
    subject: string;
    kind: string;
    last_message_at: string;
    unread: number;
    last_body: string | null;
    participants: string | null;
  }>(
    `SELECT c.id, c.subject, c.kind, c.last_message_at,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.created_at > COALESCE(p.last_read_at, '1970-01-01') AND m.sender_id != ?) AS unread,
            (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
            (SELECT GROUP_CONCAT(u.first_name, ', ') FROM conversation_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.conversation_id = c.id AND cp.user_id != ?) AS participants
       FROM conversations c
       JOIN conversation_participants p ON p.conversation_id = c.id AND p.user_id = ?
      ORDER BY c.last_message_at DESC`,
    [user.id, user.id, user.id],
  );

  const people = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' AND id != ? ORDER BY first_name",
    [user.id],
  );

  return (
    <>
      <PageHeader title="Messages" subtitle="Internal conversations with your team, managers and clients." />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Panel padded={false}>
          <ul className="divide-y divide-navy-100">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <Link href={`/dashboard/messages/${conversation.id}`} className="flex items-start gap-3 p-4 transition-colors hover:bg-navy-50/60">
                  <Avatar name={conversation.participants || conversation.subject} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-navy-900">
                        {conversation.subject || conversation.participants || 'Conversation'}
                      </span>
                      <span className="shrink-0 text-2xs text-navy-400">{timeAgo(conversation.last_message_at)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-navy-500">
                      {conversation.participants}
                    </span>
                    {conversation.last_body && (
                      <span className="mt-1 line-clamp-1 block text-xs text-navy-500">{conversation.last_body}</span>
                    )}
                  </span>
                  {conversation.unread > 0 && (
                    <span className="mt-1 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-2xs font-semibold text-white">
                      {conversation.unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-navy-500">No conversations yet. Start one on the right.</li>
            )}
          </ul>
        </Panel>

        <Panel title="Start a conversation">
          <ConversationForm people={people} />
        </Panel>
      </div>
    </>
  );
}
