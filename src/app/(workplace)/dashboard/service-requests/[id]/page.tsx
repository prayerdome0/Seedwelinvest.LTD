import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Paperclip } from 'lucide-react';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requirePermission } from '@/lib/auth/guards';
import { queryAll, queryOne } from '@/lib/db';
import { StatusPill } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';
import { SERVICE_REQUEST_STATUSES, SERVICE_REQUEST_STATUS_LABELS } from '@/lib/rbac';
import { ActionForm, InlineActionForm } from '@/components/dashboard/forms';
import { setServiceRequestStatusAction, assignServiceRequestAction, convertRequestToProjectAction } from '@/app/actions/workplace';

export const dynamic = 'force-dynamic';

export default async function ServiceRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('service_requests.view', '/dashboard/service-requests');
  const { id } = await params;
  const requestId = Number(id);

  const request = queryOne<{
    id: number;
    reference: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    budget: string;
    deadline: string | null;
    description: string;
    status: string;
    attachment_path: string | null;
    created_at: string;
    service: string | null;
    assigned_to: number | null;
    project_id: number | null;
    project_name: string | null;
  }>(
    `SELECT r.*, s.name AS service, p.name AS project_name
       FROM service_requests r LEFT JOIN services s ON s.id = r.service_id LEFT JOIN projects p ON p.id = r.project_id
      WHERE r.id = ?`,
    [requestId],
  );
  if (!request) notFound();

  const staff = queryAll<{ id: number; name: string }>(
    "SELECT id, TRIM(first_name || ' ' || last_name) AS name FROM users WHERE status = 'active' AND role_key NOT IN ('client','applicant') ORDER BY first_name",
  );

  return (
    <>
      <PageHeader
        title={request.reference}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={request.status} label={SERVICE_REQUEST_STATUS_LABELS[request.status]} />
            <span>
              {request.name}
              {request.company ? ` · ${request.company}` : ''}
            </span>
          </span>
        }
        breadcrumb={[{ label: 'Service requests', href: '/dashboard/service-requests' }, { label: request.reference }]}
        actions={
          <Link href="/dashboard/service-requests" className="inline-flex items-center rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-900 hover:bg-navy-50">
            Back
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <Panel title="What they asked for" subtitle={`Received ${formatDateTime(request.created_at)}`}>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                { label: 'Service', value: request.service || 'General enquiry' },
                { label: 'Contact', value: request.email },
                { label: 'Phone', value: request.phone || '—' },
                { label: 'Indicative budget', value: request.budget || '—' },
                { label: 'Deadline', value: request.deadline || '—' },
                { label: 'Company', value: request.company || '—' },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">{row.label}</dt>
                  <dd className="mt-0.5 break-words text-navy-800">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 border-t border-navy-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Message</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy-700">{request.description}</p>
            </div>
            {request.attachment_path && (
              <div className="mt-5 border-t border-navy-100 pt-4">
                <a
                  href={`/api/files/${request.attachment_path}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50"
                >
                  <Paperclip size={15} aria-hidden /> Download attachment
                </a>
              </div>
            )}
          </Panel>

          {request.project_id && (
            <Panel title="Converted to project">
              <Link href={`/dashboard/projects/${request.project_id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                {request.project_name} →
              </Link>
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <Panel title="Assign">
            <ActionForm
              action={assignServiceRequestAction}
              submitLabel="Assign"
              variant="primary"
              formClassName="space-y-3"
            >
              <input type="hidden" name="id" value={requestId} />
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">Team member</span>
                <select name="assigned_to" defaultValue={request.assigned_to ?? ''} className="field-input">
                  <option value="">Unassigned</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
            </ActionForm>
          </Panel>

          <Panel title="Status">
            <div className="flex flex-wrap gap-2">
              {SERVICE_REQUEST_STATUSES.map((status) => (
                <InlineActionForm
                  key={status}
                  action={setServiceRequestStatusAction}
                  fields={{ id: requestId, status }}
                  label={SERVICE_REQUEST_STATUS_LABELS[status]}
                  variant={request.status === status ? 'primary' : 'outline'}
                />
              ))}
            </div>
          </Panel>

          {!request.project_id && (
            <Panel title="Convert to project">
              <p className="mb-3 text-xs leading-relaxed text-navy-600">
                Creates a delivery project from this request so the work can be tracked to completion.
              </p>
              <InlineActionForm
                action={convertRequestToProjectAction}
                fields={{ id: requestId }}
                label="Create project"
                variant="primary"
              />
            </Panel>
          )}

          <Panel title="Reply">
            <a
              href={`mailto:${request.email}`}
              className="inline-flex w-full items-center justify-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
            >
              Email {request.email}
            </a>
            {request.phone && (
              <a
                href={`https://wa.me/${request.phone.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50"
              >
                WhatsApp {request.phone}
              </a>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
