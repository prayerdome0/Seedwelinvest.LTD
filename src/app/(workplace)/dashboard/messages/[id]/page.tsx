import Link from 'next/link';
import { notFound } from 'next/navigation';
import { execute, queryAll, queryOne } from '@/lib/db';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { Avatar } from '@/components/ui/Avatar';
import { MessageComposer } from '@/components/dashboard/ConversationForm';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('messages.use', '/dashboard/messages');
  const { id } = await params;
  const conversationId = Number(id);

  const conversation = queryOne<{ id: number; subject: string; kind: string }>(
    'SELECT id, subject, kind FROM conversations WHERE id = ?',
    [conversationId],
  );
  if (!conversation) notFound();

  const isParticipant = !!queryOne('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?', [
    conversationId,
    user.id,
  ]);
  if (!isParticipant) notFound();

  const messages = queryAll<{ id: number; body: string; created_at: string; author: string; sender_id: number }>(
    `SELECT m.id, m.body, m.created_at, TRIM(u.first_name || ' ' || u.last_name) AS author, m.sender_id
       FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = ? ORDER BY m.created_at ASC`,
    [conversationId],
  );

  const participants = queryAll<{ id: number; name: string }>(
    `SELECT u.id, TRIM(u.first_name || ' ' || u.last_name) AS name
       FROM conversation_participants p JOIN users u ON u.id = p.user_id WHERE p.conversation_id = ?`,
    [conversationId],
  );

  // Mark this thread as read for the current user.
  execute("UPDATE conversation_participants SET last_read_at = datetime('now') WHERE conversation_id = ? AND user_id = ?", [
    conversationId,
    user.id,
  ]);

  return (
    <>
      <PageHeader
        title={conversation.subject || 'Conversation'}
        subtitle={participants.map((p) => p.name).join(', ')}
        breadcrumb={[{ label: 'Messages', href: '/dashboard/messages' }, { label: conversation.subject || 'Conversation' }]}
        actions={
          <Link href="/dashboard/messages" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
            All messages
          </Link>
        }
      />

      <Panel padded={false}>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
          {messages.map((message) => {
            const mine = message.sender_id === user.id;
            return (
              <div key={message.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar name={message.author} size={32} />
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-800'}`}>
                  <p className={`text-2xs ${mine ? 'text-white/70' : 'text-navy-500'}`}>
                    {mine ? 'You' : message.author} ·{' '}
                    {new Date(message.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'UTC',
                    })}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{message.body}</p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && <p className="py-6 text-center text-sm text-navy-500">No messages yet.</p>}
        </div>
        <MessageComposer conversationId={conversationId} />
      </Panel>
    </>
  );
}
