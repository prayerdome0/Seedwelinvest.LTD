import Link from 'next/link';
import { FileText, FolderOpen, MessageSquare } from 'lucide-react';
import { PageHeader, Panel, StatCard, QuickLink } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { StatusPill } from '@/components/ui/Badge';
import { formatDate, timeAgo } from '@/lib/utils';
import { getAnnouncements } from '@/lib/data/site';
import { SERVICE_REQUEST_STATUS_LABELS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function MyWorkPage() {
  const user = await requireUser('/dashboard/my-work');

  const client = queryOne<{ id: number; company_name: string }>('SELECT id, company_name FROM clients WHERE user_id = ?', [user.id]);

  const requests = queryAll<{ id: number; reference: string; status: string; created_at: string; service: string | null; description: string }>(
    `SELECT r.id, r.reference, r.status, r.created_at, s.name AS service, r.description
       FROM service_requests r LEFT JOIN services s ON s.id = r.service_id
      WHERE r.email = ? ${client ? 'OR r.client_id = ?' : ''}
      ORDER BY r.created_at DESC LIMIT 20`,
    client ? [user.email, client.id] : [user.email],
  );

  const projects = queryAll<{ id: number; name: string; status: string; progress: number; deadline: string | null }>(
    `SELECT p.id, p.name, p.status, p.progress, p.deadline FROM projects p
      JOIN project_members m ON m.project_id = p.id AND m.user_id = ?
     ORDER BY p.updated_at DESC`,
    [user.id],
  );

  const documents = queryAll<{ id: number; name: string; created_at: string; size: number }>(
    "SELECT id, name, created_at, size FROM documents WHERE owner_id = ? OR (related_type = 'client' AND related_id = ?) ORDER BY created_at DESC LIMIT 10",
    [user.id, client?.id ?? 0],
  );

  const messages = queryAll<{ id: number; subject: string; last_message_at: string }>(
    `SELECT c.id, c.subject, c.last_message_at FROM conversations c
      JOIN conversation_participants p ON p.conversation_id = c.id AND p.user_id = ?
     ORDER BY c.last_message_at DESC LIMIT 5`,
    [user.id],
  );

  const announcements = getAnnouncements('clients', 3);

  return (
    <>
      <PageHeader
        title="My work"
        subtitle={client ? `${client.company_name} — requests, projects and documents` : 'Your requests, projects and documents with Seedwel'}
        actions={
          <Link href="/request-a-service" className="inline-flex items-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            New service request
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Service requests" value={requests.length} icon={<FileText size={18} />} />
        <StatCard label="Projects" value={projects.length} icon={<FolderOpen size={18} />} tone="navy" />
        <StatCard label="Documents" value={documents.length} icon={<MessageSquare size={18} />} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Service requests" subtitle="Everything you have asked us for" padded={false}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Request</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td className="font-medium text-navy-900">{request.reference}</td>
                      <td className="max-w-[280px] truncate text-xs">{request.service || request.description.slice(0, 60)}</td>
                      <td>
                        <StatusPill status={request.status} label={SERVICE_REQUEST_STATUS_LABELS[request.status]} />
                      </td>
                      <td className="whitespace-nowrap text-xs text-navy-500">{formatDate(request.created_at)}</td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-navy-500">
                        You have not submitted a request yet.{' '}
                        <Link href="/request-a-service" className="font-medium text-brand-600">
                          Request a service
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Projects">
            {projects.length === 0 ? (
              <p className="py-4 text-sm text-navy-500">No projects yet.</p>
            ) : (
              <ul className="divide-y divide-navy-100">
                {projects.map((project) => (
                  <li key={project.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/dashboard/projects/${project.id}`} className="text-sm font-medium text-navy-900 hover:text-brand-600">
                        {project.name}
                      </Link>
                      <StatusPill status={project.status} />
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
                      <div className="h-full rounded-full bg-navy-900" style={{ width: `${project.progress}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-navy-500">
                      {project.progress}% complete{project.deadline ? ` · target ${formatDate(project.deadline)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Documents" action={<QuickLink href="/dashboard/documents" label="All" />}>
            {documents.length === 0 ? (
              <p className="py-3 text-sm text-navy-500">No documents shared yet.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-navy-700">{doc.name}</span>
                    <a href={`/api/documents/${doc.id}`} className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700">
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Messages" action={<QuickLink href="/dashboard/messages" label="Open" />}>
            {messages.length === 0 ? (
              <p className="py-3 text-sm text-navy-500">No conversations yet.</p>
            ) : (
              <ul className="space-y-3">
                {messages.map((message) => (
                  <li key={message.id}>
                    <Link href={`/dashboard/messages/${message.id}`} className="block text-sm font-medium text-navy-900 hover:text-brand-600">
                      {message.subject || 'Conversation'}
                    </Link>
                    <p className="text-2xs text-navy-500">{timeAgo(message.last_message_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {announcements.length > 0 && (
            <Panel title="Announcements">
              <ul className="space-y-4">
                {announcements.map((item) => (
                  <li key={item.id}>
                    <p className="text-sm font-semibold text-navy-900">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-navy-600">{item.body}</p>
                    <p className="mt-1 text-2xs text-navy-400">{formatDate(item.published_at)}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
