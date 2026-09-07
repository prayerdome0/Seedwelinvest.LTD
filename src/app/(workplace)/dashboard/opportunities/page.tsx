import Link from 'next/link';
import { Handshake, ShieldAlert } from 'lucide-react';
import { PageHeader, Panel, EmptyRow, TableWrap, StatCard } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { OPPORTUNITY_CATEGORIES } from '@/lib/rbac';
import { InlineActionForm } from '@/components/dashboard/forms';
import { deleteOpportunityAction } from '@/app/actions/admin';
import { OpportunityForm } from '@/components/dashboard/OpportunityForm';

export const dynamic = 'force-dynamic';

export default async function OpportunitiesAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  await requirePermission('opportunities.manage', '/dashboard/opportunities');
  const params = await searchParams;
  const editingId = Number(params.edit || 0);

  const opportunities = queryAll<{
    id: number;
    title: string;
    category: string;
    summary: string;
    description: string;
    location: string;
    industry: string;
    status: string;
    requirements: string;
    investment_range: string;
    closing_date: string | null;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    disclaimer: string;
    is_regulated: number;
    is_featured: number;
    interests: number;
    created_at: string;
  }>(
    `SELECT o.*, (SELECT COUNT(*) FROM opportunity_interests i WHERE i.opportunity_id = o.id) AS interests
       FROM opportunities o ORDER BY CASE o.status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 WHEN 'closed' THEN 2 ELSE 3 END, o.created_at DESC`,
  );

  const editing = editingId ? opportunities.find((o) => o.id === editingId) : undefined;

  if (params.new === '1' || editing) {
    return (
      <>
        <PageHeader
          title={editing ? 'Edit opportunity' : 'New opportunity'}
          subtitle={editing ? editing.title : 'Publish a partnership, project or business opportunity.'}
          breadcrumb={[{ label: 'Opportunities', href: '/dashboard/opportunities' }, { label: editing ? 'Edit' : 'New' }]}
          actions={
            <Link href="/dashboard/opportunities" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
              Back
            </Link>
          }
        />
        <div className="max-w-3xl">
          <OpportunityForm
            categories={OPPORTUNITY_CATEGORIES}
            defaults={
              editing
                ? {
                    id: editing.id,
                    title: editing.title,
                    category: editing.category,
                    summary: editing.summary,
                    description: editing.description,
                    location: editing.location,
                    industry: editing.industry,
                    status: editing.status,
                    requirements: editing.requirements,
                    investment_range: editing.investment_range,
                    closing_date: editing.closing_date,
                    contact_name: editing.contact_name,
                    contact_email: editing.contact_email,
                    contact_phone: editing.contact_phone,
                    disclaimer: editing.disclaimer,
                    is_regulated: editing.is_regulated,
                    is_featured: editing.is_featured,
                  }
                : undefined
            }
          />
        </div>
      </>
    );
  }

  const totalInterests = opportunities.reduce((sum, o) => sum + o.interests, 0);
  const published = opportunities.filter((o) => o.status === 'published').length;

  return (
    <>
      <PageHeader
        title="Opportunities"
        subtitle="Partnerships, projects and business opportunities published on the website."
        actions={
          <Link href="/dashboard/opportunities?new=1" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            New opportunity
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Published" value={published} tone="navy" />
        <StatCard label="Total" value={opportunities.length} />
        <StatCard label="Expressions of interest" value={totalInterests} tone="gold" />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <ShieldAlert size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
        <p className="text-xs leading-relaxed text-amber-900">
          Never describe an opportunity as a regulated investment product unless the activity has been reviewed and
          licensed. Regulated categories are always marked on the public page and are only published after legal and
          SEC-related review.
        </p>
      </div>

      <Panel padded={false} className="mt-5">
        <TableWrap className="rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Category</th>
                <th>Interest</th>
                <th>Status</th>
                <th>Closes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opportunity) => {
                const category = OPPORTUNITY_CATEGORIES.find((c) => c.key === opportunity.category);
                return (
                  <tr key={opportunity.id}>
                    <td>
                      <Link href={`/dashboard/opportunities?edit=${opportunity.id}`} className="font-medium text-navy-900 hover:text-brand-600">
                        {opportunity.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-navy-500">{opportunity.location}</p>
                    </td>
                    <td className="text-xs">
                      <Badge tone={opportunity.is_regulated ? 'warning' : 'neutral'}>{category?.label ?? opportunity.category}</Badge>
                    </td>
                    <td className="text-xs text-navy-600">{opportunity.interests}</td>
                    <td>
                      <Badge tone={opportunity.status === 'published' ? 'success' : 'neutral'}>{opportunity.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap text-xs text-navy-600">{opportunity.closing_date ? formatDate(opportunity.closing_date) : '—'}</td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link
                          href={`/dashboard/opportunities?edit=${opportunity.id}`}
                          className="inline-flex items-center rounded-lg border border-navy-200 px-2.5 py-1 text-2xs font-medium text-navy-900 hover:bg-navy-50"
                        >
                          Edit
                        </Link>
                        <InlineActionForm
                          action={deleteOpportunityAction}
                          fields={{ id: opportunity.id }}
                          label="Delete"
                          confirm={`Delete “${opportunity.title}”?`}
                          variant="ghost"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {opportunities.length === 0 && (
                <EmptyRow colSpan={6}>
                  <span className="inline-flex items-center gap-2">
                    <Handshake size={16} aria-hidden /> No opportunities yet.
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
