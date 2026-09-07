import 'server-only';
import { cache } from 'react';
import { queryAll, queryOne } from '@/lib/db';
import { safeJson } from '@/lib/utils';

/* ------------------------------------------------------------ content blocks */

export interface ContentBlock {
  key: string;
  page: string;
  title: string;
  subtitle: string;
  body: string;
  extra: Record<string, any>;
  image_path: string | null;
}

export const getContentBlock = cache((key: string): ContentBlock | null => {
  const row = queryOne<any>('SELECT * FROM content_blocks WHERE key = ?', [key]);
  if (!row) return null;
  return {
    key: row.key,
    page: row.page,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    extra: safeJson<Record<string, any>>(row.extra, {}),
    image_path: row.image_path,
  };
});

export const getContentMap = cache((page: string): Record<string, ContentBlock> => {
  const rows = queryAll<any>('SELECT * FROM content_blocks WHERE page = ?', [page]);
  const out: Record<string, ContentBlock> = {};
  for (const row of rows) {
    out[row.key] = {
      key: row.key,
      page: row.page,
      title: row.title,
      subtitle: row.subtitle,
      body: row.body,
      extra: safeJson<Record<string, any>>(row.extra, {}),
      image_path: row.image_path,
    };
  }
  return out;
});

export function getExtra<T>(block: ContentBlock | null, key: string, fallback: T): T {
  if (!block) return fallback;
  return (block.extra?.[key] ?? fallback) as T;
}

/* ------------------------------------------------------------------ services */

export interface ServiceRow {
  id: number;
  updated_at: string;
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
}

export const DIVISION_LABELS: Record<string, string> = {
  digital: 'Digital Solutions',
  branding: 'Branding & Creative',
  business: 'Business Support & Development',
  talent: 'Talent & Recruitment',
  education: 'Education & Skills',
  opportunities: 'Business & Investment Opportunities',
};

export const getServices = cache((opts: { publishedOnly?: boolean; featured?: boolean; limit?: number } = {}): ServiceRow[] => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.publishedOnly !== false) where.push('is_published = 1');
  if (opts.featured) where.push('is_featured = 1');
  const sql = `SELECT * FROM services ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY sort_order ASC, name ASC${
    opts.limit ? ' LIMIT ?' : ''
  }`;
  if (opts.limit) params.push(opts.limit);
  return queryAll<ServiceRow>(sql, params);
});

export const getServiceBySlug = cache((slug: string): ServiceRow | null => {
  return queryOne<ServiceRow>('SELECT * FROM services WHERE slug = ? AND is_published = 1', [slug]) ?? null;
});

/* ---------------------------------------------------------------------- jobs */

export interface JobRow {
  id: number;
  slug: string;
  title: string;
  department: string;
  employment_type: string;
  location: string;
  remote_status: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_visible: number;
  positions: number;
  summary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  skills: string;
  deadline: string | null;
  status: string;
  is_featured: number;
  created_at: string;
  updated_at: string;
}

export const getJobs = cache((opts: { statuses?: string[]; featured?: boolean; limit?: number } = {}): JobRow[] => {
  const statuses = opts.statuses ?? ['published'];
  const params: unknown[] = statuses;
  let sql = `SELECT * FROM jobs WHERE status IN (${statuses.map(() => '?').join(',')})`;
  if (opts.featured) sql += ' AND is_featured = 1';
  sql += ' ORDER BY is_featured DESC, created_at DESC';
  if (opts.limit) {
    sql += ' LIMIT ?';
    params.push(opts.limit);
  }
  return queryAll<JobRow>(sql, params);
});

export const getJobBySlug = cache((slug: string): JobRow | null => {
  return queryOne<JobRow>('SELECT * FROM jobs WHERE slug = ?', [slug]) ?? null;
});

/* ------------------------------------------------------------------ projects */

export interface ProjectRow {
  id: number;
  slug: string;
  name: string;
  client_label: string;
  summary: string;
  description: string;
  services: string;
  technologies: string;
  results: string;
  cover_image: string | null;
  link: string;
  status: string;
  progress: number;
  start_date: string | null;
  deadline: string | null;
  is_published: number;
  is_featured: number;
}

export const getProjects = cache((opts: { publishedOnly?: boolean; featured?: boolean; limit?: number } = {}): ProjectRow[] => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.publishedOnly !== false) where.push('is_published = 1');
  if (opts.featured) where.push('is_featured = 1');
  let sql = `SELECT * FROM projects ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY is_featured DESC, start_date DESC`;
  if (opts.limit) {
    sql += ' LIMIT ?';
    params.push(opts.limit);
  }
  return queryAll<ProjectRow>(sql, params);
});

export const getProjectBySlug = cache((slug: string): ProjectRow | null => {
  return queryOne<ProjectRow>('SELECT * FROM projects WHERE slug = ? AND is_published = 1', [slug]) ?? null;
});

/* ------------------------------------------------------------- opportunities */

export interface OpportunityRow {
  id: number;
  updated_at: string;
  slug: string;
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
  is_regulated: number;
  disclaimer: string;
  is_featured: number;
}

export const getOpportunities = cache((opts: { publishedOnly?: boolean; featured?: boolean; limit?: number } = {}): OpportunityRow[] => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.publishedOnly !== false) where.push("status = 'published'");
  if (opts.featured) where.push('is_featured = 1');
  let sql = `SELECT * FROM opportunities ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY is_featured DESC, created_at DESC`;
  if (opts.limit) {
    sql += ' LIMIT ?';
    params.push(opts.limit);
  }
  return queryAll<OpportunityRow>(sql, params);
});

export const getOpportunityBySlug = cache((slug: string): OpportunityRow | null => {
  return queryOne<OpportunityRow>('SELECT * FROM opportunities WHERE slug = ?', [slug]) ?? null;
});

/* ------------------------------------------------------------ other sections */

export interface LeaderRow {
  id: number;
  name: string;
  title: string;
  short_bio: string;
  bio: string;
  message: string;
  responsibilities: string;
  focus: string;
  email: string;
  linkedin: string;
  image_path: string | null;
  sort_order: number;
}

export const getLeadership = cache((): LeaderRow[] =>
  queryAll<LeaderRow>('SELECT * FROM leadership WHERE is_published = 1 ORDER BY sort_order ASC, id ASC'),
);

export const getTestimonials = cache((): Array<{
  id: number;
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar_path: string | null;
  rating: number;
}> => queryAll('SELECT * FROM testimonials WHERE is_published = 1 ORDER BY sort_order ASC, id ASC'));

export const getFaqs = cache((): Array<{ id: number; question: string; answer: string; category: string }> =>
  queryAll('SELECT * FROM faqs WHERE is_published = 1 ORDER BY sort_order ASC, id ASC'),
);

export const getCourses = cache((): Array<{
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  outcomes: string;
  duration: string;
  level: string;
  mode: string;
  image_path: string | null;
}> => queryAll('SELECT * FROM courses WHERE is_published = 1 ORDER BY sort_order ASC, id ASC'));

export const getAnnouncements = cache((audience = 'all', limit = 5): Array<{
  id: number;
  title: string;
  body: string;
  audience: string;
  priority: string;
  published_at: string;
}> =>
  queryAll(
    "SELECT * FROM announcements WHERE is_published = 1 AND audience IN (?, 'all') ORDER BY published_at DESC LIMIT ?",
    [audience, limit],
  ),
);

/* ------------------------------------------------------------------- metrics */

export interface Stat {
  value: string;
  label: string;
}

export const getHomeStats = cache((): Stat[] => {
  const block = getContentBlock('home.stats');
  const items = getExtra<Stat[]>(block, 'items', [
    { value: '2025', label: 'Year registered in Zambia' },
  ]);
  return items;
});

export function liveCounts() {
  const publishedJobs = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM jobs WHERE status = 'published'")?.c ?? 0;
  const services = queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM services WHERE is_published = 1')?.c ?? 0;
  const projects = queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM projects WHERE is_published = 1')?.c ?? 0;
  const opportunities = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM opportunities WHERE status = 'published'")?.c ?? 0;
  const courses = queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM courses WHERE is_published = 1')?.c ?? 0;
  const staff = queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM users WHERE status = 'active' AND role_key NOT IN ('client', 'applicant')",
  )?.c ?? 0;
  return { publishedJobs, services, projects, opportunities, courses, staff };
}
