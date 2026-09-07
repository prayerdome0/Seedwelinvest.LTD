import 'server-only';
import { cache } from 'react';
import { queryAll, queryOne, execute } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export type Settings = Record<string, string>;

export const getSettings = cache((): Settings => {
  const rows = queryAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const out: Settings = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
});

export function getSetting(key: string, fallback = ''): string {
  const row = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

export function updateSettings(patch: Settings, actor: { id: number; fullName: string }): void {
  for (const [key, value] of Object.entries(patch)) {
    const previous = getSetting(key);
    if (previous === String(value)) continue;
    execute('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime(\'now\')', [
      key,
      String(value ?? ''),
    ]);
    void logAudit({
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'settings.updated',
      entityType: 'setting',
      entityLabel: key,
      field: key,
      previousValue: previous,
      newValue: String(value ?? ''),
    });
  }
}

export interface CompanyInfo {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  year: string;
  country: string;
  city: string;
  address: string;
  hours: string;
  email: string;
  phone: string;
  phoneAlt: string;
  whatsapp: string;
  mapUrl: string;
  facebook: string;
  x: string;
  linkedin: string;
  instagram: string;
  tiktok: string;
  siteUrl: string;
  seoSuffix: string;
  seoDescription: string;
  ogImage: string;
  footerNote: string;
  investmentDisclaimer: string;
  registrationNote: string;
  demoContent: boolean;
  allowPublicRegistration: boolean;
}

export const getCompany = cache((): CompanyInfo => {
  const s = getSettings();
  return {
    name: s.company_name || 'Seedwel Investment Limited',
    legalName: s.company_legal_name || 'Seedwel Investment Limited',
    tagline: s.company_tagline || 'Building Businesses. Creating Opportunities. Driving Growth.',
    description: s.company_short_description || '',
    year: s.company_registration_year || '2025',
    country: s.company_country || 'Zambia',
    city: s.company_city || 'Lusaka',
    address: s.company_address || 'Lusaka, Zambia',
    hours: s.company_hours || 'Monday – Friday, 08:30 – 17:00 CAT',
    email: s.contact_email || '',
    phone: s.contact_phone || '',
    phoneAlt: s.contact_phone_alt || '',
    whatsapp: s.contact_whatsapp || s.contact_phone || '',
    mapUrl: s.contact_map_url || '',
    facebook: s.social_facebook || '',
    x: s.social_x || '',
    linkedin: s.social_linkedin || '',
    instagram: s.social_instagram || '',
    tiktok: s.social_tiktok || '',
    siteUrl: s.site_url || '',
    seoSuffix: s.seo_title_suffix || 'Seedwel Investment Limited',
    seoDescription: s.seo_default_description || '',
    ogImage: s.og_image || '/images/hero-office.jpg',
    footerNote: s.footer_note || '',
    investmentDisclaimer: s.legal_investment_disclaimer || '',
    registrationNote: s.legal_registration_note || '',
    demoContent: s.demo_content === '1',
    allowPublicRegistration: s.allow_public_registration !== '0',
  };
});
