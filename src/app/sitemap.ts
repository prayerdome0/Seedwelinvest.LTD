import type { MetadataRoute } from 'next';
import { getJobs, getOpportunities, getProjects, getServices } from '@/lib/data/site';
import { LEGAL_NAV } from '@/lib/nav';

const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: Array<[string, number]> = [
    ['', 1],
    ['/about', 0.8],
    ['/what-we-do', 0.8],
    ['/services', 0.9],
    ['/projects', 0.7],
    ['/opportunities', 0.8],
    ['/careers', 0.9],
    ['/education', 0.7],
    ['/contact', 0.7],
    ['/request-a-service', 0.8],
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map(([path, priority]) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority,
  }));

  for (const service of getServices()) {
    entries.push({
      url: `${base}/services/${service.slug}`,
      lastModified: new Date(service.updated_at.replace(' ', 'T') + 'Z'),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  for (const job of getJobs({ statuses: ['published'] })) {
    entries.push({
      url: `${base}/careers/${job.slug}`,
      lastModified: new Date(job.updated_at.replace(' ', 'T') + 'Z'),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  for (const project of getProjects()) {
    entries.push({
      url: `${base}/projects/${project.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  for (const opportunity of getOpportunities()) {
    entries.push({
      url: `${base}/opportunities/${opportunity.slug}`,
      lastModified: new Date(opportunity.updated_at.replace(' ', 'T') + 'Z'),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  for (const item of LEGAL_NAV) {
    entries.push({ url: `${base}${item.href}`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 });
  }

  return entries;
}
