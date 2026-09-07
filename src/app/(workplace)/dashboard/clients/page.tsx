import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { PageHeader, Panel, EmptyRow, TableWrap } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { ClientForm } from '@/components/dashboard/ClientForm';
import { InlineActionForm } from '@/components/dashboard/forms';
import { deleteClientAction } from '@/app/actions/workplace';

export const dynamic = 'force-dynamic';

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string; q?: string }> }) {
  await requirePermission('clients.view', '/dashboard/clients');
  const params = await searchParams;
  const q = (params.q || '').trim();
  const editingId = Number(params.edit || 0);

  const args: unknown[] = [];
  let whereSql = '';
  if (q) {
    whereSql = 'WHERE c.company_name LIKE ? OR c.contact_name LIKE ? OR c.email LIKE ?';
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const clients = queryAll<{
    id: number;
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
    industry: string;
    country: string;
    status: string;
    notes: string;
    owner_id: number | null;
    projects: number;
    requests: number;
    created_at: string;
  }>(
    `SELECT c.*,
            (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) AS projects,
            (SELECT COUNT(*) FROM service_requests r WHERE r.client_id = c.id) AS requests
       FROM clients c ${whereSql} ORDER BY c.company_name`,
    args,
  );

  const editing = editingId ? clients.find((c) => c.id === editingId) : undefined;
  const staff = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' AND role_key NOT IN ('client','applicant') ORDER BY first_name",
  );

  if (params.new === '1' || editing) {
    return (
      <>
        <PageHeader
          title={editing ? 'Edit client' : 'New client'}
          subtitle={editing ? editing.company_name : 'Add a company you work with.'}
          breadcrumb={[{ label: 'Clients', href: '/dashboard/clients' }, { label: editing ? 'Edit' : 'New' }]}
          actions={
            <Link href="/dashboard/clients" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
              Back to clients
            </Link>
          }
        />
        <div className="max-w-2xl">
          <ClientForm
            owners={staff}
            defaults={
              editing
                ? {
                    id: editing.id,
                    company_name: editing.company_name,
                    contact_name: editing.contact_name,
                    email: editing.email,
                    phone: editing.phone,
                    industry: editing.industry,
                    country: editing.country,
                    status: editing.status,
                    notes: editing.notes,
                    owner_id: editing.owner_id,
                  }
                : undefined
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} compan${clients.length === 1 ? 'y' : 'ies'} in the client book`}
        actions={
          <Link href="/dashboard/clients?new=1" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            New client
          </Link>
        }
      />

      <form method="get" className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Search</span>
          <input name="q" defaultValue={q} placeholder="Company, contact or email…" className="field-input" />
        </label>
        <button type="submit" className="inline-flex h-[42px] items-center rounded-xl bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800">
          Search
        </button>
      </form>

      <Panel padded={false}>
        <TableWrap className="rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Projects</th>
                <th>Requests</th>
                <th>Status</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link href={`/dashboard/clients?edit=${client.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                      {client.company_name}
                    </Link>
                    {client.industry && <p className="mt-0.5 text-xs text-navy-500">{client.industry}</p>}
                  </td>
                  <td>
                    <span className="block text-xs text-navy-700">{client.contact_name || '—'}</span>
                    <span className="block text-xs text-navy-500">{client.email || '—'}</span>
                  </td>
                  <td className="text-xs text-navy-600">{client.projects}</td>
                  <td className="text-xs text-navy-600">{client.requests}</td>
                  <td>
                    <Badge tone={client.status === 'active' ? 'success' : client.status === 'prospect' ? 'warning' : 'neutral'}>
                      {client.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap text-xs text-navy-500">{formatDate(client.created_at)}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link href={`/dashboard/clients?edit=${client.id}`} className="inline-flex items-center rounded-lg border border-navy-200 px-2.5 py-1 text-2xs font-medium text-navy-900 hover:bg-navy-50">
                        Edit
                      </Link>
                      <InlineActionForm
                        action={deleteClientAction}
                        fields={{ id: client.id }}
                        label="Delete"
                        confirm={`Delete ${client.company_name}?`}
                        variant="ghost"
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <EmptyRow colSpan={7}>
                  <span className="inline-flex items-center gap-2">
                    <Building2 size={16} aria-hidden /> No clients yet.
                  </span>
                </EmptyRow>
              )}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </>
  );
}
