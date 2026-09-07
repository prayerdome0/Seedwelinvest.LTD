import Link from 'next/link';
import { PageHeader, Panel, EmptyRow, TableWrap } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { DIVISION_LABELS } from '@/lib/data/site';
import { Icon } from '@/components/ui/Icon';
import { ICON_NAMES } from '@/components/ui/Icon';
import { InlineActionForm } from '@/components/dashboard/forms';
import { deleteServiceAction } from '@/app/actions/admin';
import { ServiceForm } from '@/components/dashboard/ServiceForm';

export const dynamic = 'force-dynamic';

export default async function ServicesAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  await requirePermission('services.manage', '/dashboard/services');
  const params = await searchParams;

  const services = queryAll<{
    id: number;
    slug: string;
    name: string;
    division: string;
    icon: string;
    summary: string;
    description: string;
    benefits: string;
    process: string;
    deliverables: string;
    image_path: string | null;
    starting_price: string;
    is_featured: number;
    is_published: number;
    sort_order: number;
  }>('SELECT * FROM services ORDER BY division, sort_order, name');

  const editingId = Number(params.edit || 0);
  const editing = editingId ? services.find((s) => s.id === editingId) : undefined;

  if (params.new === '1' || editing) {
    return (
      <>
        <PageHeader
          title={editing ? 'Edit service' : 'New service'}
          subtitle={editing ? editing.name : 'Add a service to the public website.'}
          breadcrumb={[{ label: 'Services', href: '/dashboard/services' }, { label: editing ? 'Edit' : 'New' }]}
          actions={
            <Link href="/dashboard/services" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
              Back to services
            </Link>
          }
        />
        <div className="max-w-3xl">
          <ServiceForm
            icons={ICON_NAMES}
            defaults={
              editing
                ? {
                    id: editing.id,
                    name: editing.name,
                    division: editing.division,
                    icon: editing.icon,
                    summary: editing.summary,
                    description: editing.description,
                    benefits: editing.benefits,
                    process: editing.process,
                    deliverables: editing.deliverables,
                    starting_price: editing.starting_price,
                    is_published: editing.is_published,
                    is_featured: editing.is_featured,
                    sort_order: editing.sort_order,
                    image_path: editing.image_path,
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
        title="Services"
        subtitle="Add, edit, publish or remove the services shown on the website."
        actions={
          <Link href="/dashboard/services?new=1" className="inline-flex items-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            New service
          </Link>
        }
      />

      <Panel padded={false}>
        <TableWrap className="rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Division</th>
                <th>From</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                        <Icon name={service.icon} size={16} />
                      </span>
                      <span className="min-w-0">
                        <Link href={`/dashboard/services?edit=${service.id}`} className="block truncate font-medium text-navy-900 hover:text-brand-600">
                          {service.name}
                        </Link>
                        <span className="block truncate text-xs text-navy-500">{service.summary}</span>
                      </span>
                    </span>
                  </td>
                  <td className="text-xs text-navy-600">{DIVISION_LABELS[service.division] ?? service.division}</td>
                  <td className="whitespace-nowrap text-xs text-navy-600">{service.starting_price || '—'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={service.is_published ? 'success' : 'neutral'}>{service.is_published ? 'published' : 'hidden'}</Badge>
                      {service.is_featured ? <Badge tone="warning">featured</Badge> : null}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link
                        href={`/dashboard/services?edit=${service.id}`}
                        className="inline-flex items-center rounded-lg border border-navy-200 px-2.5 py-1 text-2xs font-medium text-navy-900 hover:bg-navy-50"
                      >
                        Edit
                      </Link>
                      <InlineActionForm
                        action={deleteServiceAction}
                        fields={{ id: service.id }}
                        label="Delete"
                        confirm={`Delete the service “${service.name}”?`}
                        variant="ghost"
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && <EmptyRow colSpan={5}>No services yet.</EmptyRow>}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </>
  );
}
