import { PageHeader, Panel } from '@/components/dashboard/ui';
import { requireUser } from '@/lib/auth/guards';
import { queryAll } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { ChangePasswordForm } from '@/components/dashboard/ChangePasswordForm';

export const dynamic = 'force-dynamic';

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'url';
  hint?: string;
}

const GROUPS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: 'Company identity',
    description: 'Shown in the header, footer and across the website.',
    fields: [
      { key: 'company_name', label: 'Company name', type: 'text' },
      { key: 'company_legal_name', label: 'Registered legal name', type: 'text' },
      { key: 'company_tagline', label: 'Tagline', type: 'text', hint: 'Building Businesses. Creating Opportunities. Driving Growth.' },
      { key: 'contact_email', label: 'Main email address', type: 'email' },
      { key: 'contact_phone', label: 'Main phone number', type: 'tel' },
      { key: 'contact_phone_alt', label: 'Alternative phone', type: 'tel' },
      { key: 'contact_whatsapp', label: 'WhatsApp number', type: 'tel' },
      { key: 'contact_map_url', label: 'Map link (optional)', type: 'url' },
      { key: 'company_address', label: 'Address', type: 'text' },
      { key: 'company_city', label: 'City', type: 'text' },
      { key: 'company_country', label: 'Country', type: 'text' },
      { key: 'company_hours', label: 'Business hours', type: 'text' },
      { key: 'site_url', label: 'Website URL', type: 'url' },
      { key: 'company_registration_year', label: 'Year established', type: 'text' },
    ],
  },
  {
    title: 'Company profile',
    description: 'Used on the home page, About page and in search results.',
    fields: [
      { key: 'company_short_description', label: 'Short company description', type: 'textarea' },
      { key: 'seo_default_description', label: 'Default search description', type: 'textarea' },
      { key: 'seo_title_suffix', label: 'Search title suffix', type: 'text' },
      { key: 'og_image', label: 'Default share image path', type: 'text', hint: 'e.g. /og-default.jpg' },
    ],
  },
  {
    title: 'Legal and compliance',
    description: 'Disclaimers shown on opportunities and in the footer.',
    fields: [
      { key: 'legal_investment_disclaimer', label: 'Investment disclaimer', type: 'textarea', hint: 'Shown on every opportunity page and in the footer.' },
      { key: 'legal_registration_note', label: 'Registration note', type: 'textarea' },
      { key: 'footer_note', label: 'Footer note', type: 'textarea' },
    ],
  },
  {
    title: 'Social profiles',
    description: 'Optional links shown in the footer.',
    fields: [
      { key: 'social_facebook', label: 'Facebook URL', type: 'url' },
      { key: 'social_linkedin', label: 'LinkedIn URL', type: 'url' },
      { key: 'social_x', label: 'X (Twitter) URL', type: 'url' },
      { key: 'social_instagram', label: 'Instagram URL', type: 'url' },
      { key: 'social_tiktok', label: 'TikTok URL', type: 'url' },
    ],
  },
  {
    title: 'Platform',
    description: 'How the workplace behaves for visitors.',
    fields: [
      { key: 'allow_public_registration', label: 'Public registration (1 = on, 0 = off)', type: 'text' },
      { key: 'maintenance_mode', label: 'Maintenance mode (1 = on, 0 = off)', type: 'text' },
      { key: 'demo_content', label: 'Demonstration data banner (1 = show)', type: 'text' },
    ],
  },
];

export default async function SettingsPage() {
  const user = await requireUser('/dashboard/settings');
  const settings = getSettings();
  const canManage = user.permissions.includes('settings.manage') || user.permissions.includes('system.super');

  const outbox = canManage
    ? queryAll<{ id: number; to_email: string; subject: string; created_at: string }>(
        'SELECT id, to_email, subject, created_at FROM email_outbox ORDER BY created_at DESC LIMIT 25',
      )
    : [];

  return (
    <>
      <PageHeader title="Settings" subtitle="Company information, legal notices and your account security." />

      {canManage ? (
        <form action="/dashboard/settings" method="get" className="hidden" />
      ) : (
        <div className="mb-5 rounded-2xl border border-navy-100 bg-mist p-4 text-sm text-navy-600">
          Only an administrator can change company settings. You can still change your own password below.
        </div>
      )}

      <div className="space-y-5">
        <SettingsForm groups={GROUPS} values={settings} canManage={canManage} />

        {canManage && (
          <Panel title="Email outbox" subtitle="Messages the platform has generated. With an SMTP driver configured they are delivered; otherwise they are listed here.">
            {outbox.length === 0 ? (
              <p className="py-3 text-sm text-navy-500">No messages yet.</p>
            ) : (
              <ul className="divide-y divide-navy-100">
                {outbox.map((message) => (
                  <li key={message.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-navy-900">{message.subject}</span>
                      <span className="block truncate text-xs text-navy-500">To: {message.to_email}</span>
                    </span>
                    <span className="shrink-0 text-2xs text-navy-400">{message.created_at}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <Panel title="Change your password" subtitle="You will stay signed in after changing it.">
          <div className="max-w-md">
            <ChangePasswordForm />
          </div>
        </Panel>
      </div>
    </>
  );
}

function SettingsForm({
  groups,
  values,
  canManage,
}: {
  groups: typeof GROUPS;
  values: Record<string, string>;
  canManage: boolean;
}) {
  return (
    <form action="/api/settings" method="post" className="space-y-5">
      {!canManage && <fieldset disabled className="opacity-70" />}
      <input type="hidden" name="intent" value="save-settings" />
      {groups.map((group) => (
        <Panel key={group.title} title={group.title} subtitle={group.description}>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <label key={`${group.title}-${field.key}`} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-navy-500">{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea
                    name={`setting:${field.key}`}
                    rows={3}
                    defaultValue={values[field.key] ?? ''}
                    className="field-input"
                    disabled={!canManage}
                  />
                ) : (
                  <input
                    name={`setting:${field.key}`}
                    type={field.type}
                    defaultValue={values[field.key] ?? ''}
                    className="field-input"
                    disabled={!canManage}
                  />
                )}
                {field.hint && <span className="mt-1 block text-2xs text-navy-500">{field.hint}</span>}
              </label>
            ))}
          </div>
        </Panel>
      ))}
      {canManage && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="inline-flex items-center rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-800">
            Save settings
          </button>
          <p className="text-xs text-navy-500">Changes appear on the public website within a few seconds.</p>
        </div>
      )}
    </form>
  );
}
