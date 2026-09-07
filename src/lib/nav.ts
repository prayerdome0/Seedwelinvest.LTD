export interface NavItem {
  label: string;
  href: string;
  description?: string;
  permission?: string | string[];
  badge?: 'unread';
}

export const PUBLIC_NAV: NavItem[] = [
  { label: 'What We Do', href: '/what-we-do' },
  { label: 'Services', href: '/services' },
  { label: 'Projects', href: '/projects' },
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
];

export const MORE_NAV: NavItem[] = [
  { label: 'About Us', href: '/about', description: 'Who we are, our mission and values' },
  { label: 'Education & Skills', href: '/education', description: 'Practical skills programmes' },
  { label: 'Request a Service', href: '/request-a-service', description: 'Tell us what you need' },
];

export interface DashboardGroup {
  title: string;
  items: NavItem[];
}

export const DASHBOARD_NAV: DashboardGroup[] = [
  {
    title: 'Work',
    items: [
      { label: 'Overview', href: '/dashboard', permission: 'dashboard.view' },
      { label: 'My Day', href: '/dashboard/my-day', permission: 'dashboard.view' },
      { label: 'Tasks', href: '/dashboard/tasks', permission: ['tasks.view_any', 'tasks.view_assigned'] },
      { label: 'Team Today', href: '/dashboard/team', permission: ['team.monitor', 'team.view'] },
      { label: 'My Work', href: '/dashboard/my-work', permission: 'dashboard.view' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Users', href: '/dashboard/users', permission: 'users.view' },
      { label: 'Roles & Permissions', href: '/dashboard/roles', permission: 'roles.manage' },
      { label: 'Departments', href: '/dashboard/departments', permission: 'departments.manage' },
      { label: 'Clients', href: '/dashboard/clients', permission: 'clients.view' },
    ],
  },
  {
    title: 'Recruitment',
    items: [
      { label: 'Job Openings', href: '/dashboard/recruitment/jobs', permission: 'jobs.view' },
      { label: 'Applicants', href: '/dashboard/recruitment', permission: 'applications.view' },
      { label: 'My Applications', href: '/dashboard/my-applications', permission: 'dashboard.view' },
    ],
  },
  {
    title: 'Delivery',
    items: [
      { label: 'Service Requests', href: '/dashboard/service-requests', permission: 'service_requests.view' },
      { label: 'Projects', href: '/dashboard/projects', permission: ['projects.view_any', 'projects.view_assigned'] },
      { label: 'Opportunities', href: '/dashboard/opportunities', permission: 'opportunities.manage' },
      { label: 'Education', href: '/dashboard/education', permission: 'education.manage' },
    ],
  },
  {
    title: 'Communicate',
    items: [
      { label: 'Messages', href: '/dashboard/messages', permission: 'messages.use' },
      { label: 'Announcements', href: '/dashboard/announcements', permission: 'announcements.manage' },
      { label: 'Documents', href: '/dashboard/documents', permission: ['documents.view_own', 'documents.view_any'] },
      { label: 'Notifications', href: '/dashboard/notifications', permission: 'dashboard.view' },
    ],
  },
  {
    title: 'Website',
    items: [
      { label: 'Website Content', href: '/dashboard/content', permission: 'content.manage' },
      { label: 'Services', href: '/dashboard/services', permission: 'services.manage' },
      { label: 'Leadership', href: '/dashboard/leadership', permission: 'leadership.manage' },
      { label: 'Media Library', href: '/dashboard/media', permission: 'media.manage' },
      { label: 'Testimonials & FAQs', href: '/dashboard/content/testimonials', permission: 'testimonials.manage' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Reports', href: '/dashboard/reports', permission: 'reports.view' },
      { label: 'Audit Logs', href: '/dashboard/audit', permission: 'audit.view' },
      { label: 'Settings', href: '/dashboard/settings', permission: 'settings.manage' },
    ],
  },
];

export function filterNav(groups: DashboardGroup[], permissions: Set<string>): DashboardGroup[] {
  const allowed = (item: NavItem) => {
    if (!item.permission) return true;
    const perms = Array.isArray(item.permission) ? item.permission : [item.permission];
    return perms.some((p) => permissions.has(p) || permissions.has('system.super'));
  };
  return groups
    .map((g) => ({ title: g.title, items: g.items.filter(allowed) }))
    .filter((g) => g.items.length > 0);
}

export const FOOTER_NAV = [
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'What We Do', href: '/what-we-do' },
      { label: 'Leadership', href: '/about#leadership' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'All Services', href: '/services' },
      { label: 'Website Development', href: '/services/website-development' },
      { label: 'Branding & Identity', href: '/services/logo-design-and-brand-identity' },
      { label: 'Virtual Assistance', href: '/services/virtual-assistance-and-administrative-support' },
      { label: 'Request a Service', href: '/request-a-service' },
    ],
  },
  {
    title: 'Opportunities',
    links: [
      { label: 'Business Opportunities', href: '/opportunities' },
      { label: 'Careers', href: '/careers' },
      { label: 'Education & Skills', href: '/education' },
      { label: 'Projects', href: '/projects' },
    ],
  },
];

export const LEGAL_NAV = [
  { label: 'Privacy Policy', href: '/legal/privacy-policy' },
  { label: 'Terms & Conditions', href: '/legal/terms-and-conditions' },
  { label: 'Cookie Policy', href: '/legal/cookie-policy' },
  { label: 'Application Privacy Notice', href: '/legal/application-privacy-notice' },
  { label: 'Website Disclaimer', href: '/legal/website-disclaimer' },
];
