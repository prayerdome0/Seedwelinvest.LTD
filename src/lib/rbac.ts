/**
 * Permission catalogue and role definitions.
 *
 * IMPORTANT: this module is the single source of truth for what a role may do,
 * but the *enforced* check always happens on the server (see src/lib/auth/guards.ts).
 * The values stored in the `role_permissions` table can be edited by an
 * administrator at runtime, so the seeded defaults are only a starting point.
 */

export type PermissionKey =
  | 'dashboard.view'
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'users.disable'
  | 'users.reset_password'
  | 'users.assign_role'
  | 'users.assign_manager'
  | 'roles.manage'
  | 'departments.manage'
  | 'tasks.view_any'
  | 'tasks.view_assigned'
  | 'tasks.create'
  | 'tasks.assign'
  | 'tasks.update_any'
  | 'tasks.update_assigned'
  | 'tasks.delete'
  | 'tasks.approve'
  | 'tasks.comment'
  | 'team.view'
  | 'team.monitor'
  | 'jobs.view'
  | 'jobs.manage'
  | 'applications.view'
  | 'applications.manage'
  | 'onboarding.manage'
  | 'clients.view'
  | 'clients.manage'
  | 'services.manage'
  | 'service_requests.view'
  | 'service_requests.manage'
  | 'projects.view_any'
  | 'projects.view_assigned'
  | 'projects.manage'
  | 'opportunities.manage'
  | 'education.manage'
  | 'documents.view_any'
  | 'documents.view_own'
  | 'documents.upload'
  | 'documents.delete_any'
  | 'messages.use'
  | 'announcements.manage'
  | 'reports.view'
  | 'reports.export'
  | 'content.manage'
  | 'media.manage'
  | 'leadership.manage'
  | 'testimonials.manage'
  | 'faqs.manage'
  | 'settings.manage'
  | 'audit.view'
  | 'system.super';

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  category: string;
  description: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: 'dashboard.view', label: 'Access the workplace', category: 'Workplace', description: 'Sign in to Seedwel Workplace and see a dashboard.' },
  { key: 'system.super', label: 'Super administrator', category: 'System', description: 'Unrestricted access, including promoting other super administrators.' },

  { key: 'users.view', label: 'View people', category: 'People', description: 'See the staff directory and user profiles.' },
  { key: 'users.create', label: 'Create users', category: 'People', description: 'Add new users and send invitations.' },
  { key: 'users.update', label: 'Edit users', category: 'People', description: 'Edit names, contact details, department and job title.' },
  { key: 'users.delete', label: 'Delete users', category: 'People', description: 'Permanently delete a user account.' },
  { key: 'users.disable', label: 'Disable / activate accounts', category: 'People', description: 'Turn access on and off without deleting records.' },
  { key: 'users.reset_password', label: 'Reset passwords', category: 'People', description: 'Issue a password reset for another account.' },
  { key: 'users.assign_role', label: 'Assign roles', category: 'People', description: 'Change the role that determines what a user can do.' },
  { key: 'users.assign_manager', label: 'Assign managers', category: 'People', description: 'Set the reporting line for a staff member.' },

  { key: 'roles.manage', label: 'Manage roles & permissions', category: 'System', description: 'Edit the permission matrix for every role.' },
  { key: 'departments.manage', label: 'Manage departments', category: 'People', description: 'Create and edit departments and their heads.' },
  { key: 'audit.view', label: 'View audit logs', category: 'System', description: 'Read the record of administrative actions.' },
  { key: 'settings.manage', label: 'Manage settings', category: 'System', description: 'Edit company settings, contact details and integrations.' },

  { key: 'tasks.view_any', label: 'View all tasks', category: 'Tasks', description: 'See every task in the company, not only your own.' },
  { key: 'tasks.view_assigned', label: 'View my tasks', category: 'Tasks', description: 'See tasks assigned to you.' },
  { key: 'tasks.create', label: 'Create tasks', category: 'Tasks', description: 'Create tasks and work items.' },
  { key: 'tasks.assign', label: 'Assign tasks', category: 'Tasks', description: 'Assign tasks to one or several staff members.' },
  { key: 'tasks.update_any', label: 'Edit any task', category: 'Tasks', description: 'Change the details of any task.' },
  { key: 'tasks.update_assigned', label: 'Work my tasks', category: 'Tasks', description: 'Start, submit and resubmit your own tasks.' },
  { key: 'tasks.delete', label: 'Delete tasks', category: 'Tasks', description: 'Remove tasks from the system.' },
  { key: 'tasks.approve', label: 'Review & approve work', category: 'Tasks', description: 'Approve submissions or request changes.' },
  { key: 'tasks.comment', label: 'Comment on tasks', category: 'Tasks', description: 'Take part in the task conversation.' },

  { key: 'team.view', label: 'View team', category: 'Team', description: "See who is working on what today." },
  { key: 'team.monitor', label: 'Monitor daily work', category: 'Team', description: 'Track progress, deadlines and late work across the team.' },

  { key: 'jobs.view', label: 'View job openings', category: 'Recruitment', description: 'See vacancies and their pipeline.' },
  { key: 'jobs.manage', label: 'Manage job openings', category: 'Recruitment', description: 'Create, publish, close and archive vacancies.' },
  { key: 'applications.view', label: 'View applications', category: 'Recruitment', description: 'Read candidate applications and CVs.' },
  { key: 'applications.manage', label: 'Manage applications', category: 'Recruitment', description: 'Move candidates between stages, invite and reject.' },
  { key: 'onboarding.manage', label: 'Manage onboarding', category: 'Recruitment', description: 'Send invitations and complete staff registration.' },

  { key: 'clients.view', label: 'View clients', category: 'Clients', description: 'See client records.' },
  { key: 'clients.manage', label: 'Manage clients', category: 'Clients', description: 'Create and edit client records.' },
  { key: 'service_requests.view', label: 'View service requests', category: 'Clients', description: 'See incoming service requests.' },
  { key: 'service_requests.manage', label: 'Manage service requests', category: 'Clients', description: 'Assign, progress and close service requests.' },

  { key: 'projects.view_any', label: 'View all projects', category: 'Projects', description: 'See every project in the company.' },
  { key: 'projects.view_assigned', label: 'View my projects', category: 'Projects', description: 'See projects you are a member of.' },
  { key: 'projects.manage', label: 'Manage projects', category: 'Projects', description: 'Create and edit projects, milestones, files and messages.' },

  { key: 'opportunities.manage', label: 'Manage opportunities', category: 'Business', description: 'Create, publish, feature and archive opportunities.' },
  { key: 'education.manage', label: 'Manage education', category: 'Business', description: 'Publish and edit skills development programmes.' },
  { key: 'services.manage', label: 'Manage services', category: 'Website', description: 'Edit the public service directory.' },
  { key: 'content.manage', label: 'Manage website content', category: 'Website', description: 'Edit page copy, SEO text and sections across the public site.' },
  { key: 'media.manage', label: 'Media library', category: 'Website', description: 'Upload and organise images and files.' },
  { key: 'leadership.manage', label: 'Manage leadership', category: 'Website', description: 'Edit founder and director profiles.' },
  { key: 'testimonials.manage', label: 'Manage testimonials', category: 'Website', description: 'Publish and edit client testimonials.' },
  { key: 'faqs.manage', label: 'Manage FAQs', category: 'Website', description: 'Publish and edit frequently asked questions.' },

  { key: 'documents.view_own', label: 'View my documents', category: 'Documents', description: 'Access documents that belong to you.' },
  { key: 'documents.view_any', label: 'View all documents', category: 'Documents', description: 'Access documents owned by anyone in the company.' },
  { key: 'documents.upload', label: 'Upload documents', category: 'Documents', description: 'Add files to the secure document store.' },
  { key: 'documents.delete_any', label: 'Delete any document', category: 'Documents', description: 'Remove documents regardless of owner.' },

  { key: 'messages.use', label: 'Internal messaging', category: 'Communication', description: 'Send and receive internal messages.' },
  { key: 'announcements.manage', label: 'Publish announcements', category: 'Communication', description: 'Post company-wide announcements.' },

  { key: 'reports.view', label: 'View reports', category: 'Reporting', description: 'See company, recruitment and task reports.' },
  { key: 'reports.export', label: 'Export reports', category: 'Reporting', description: 'Download reports as CSV.' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export const PERMISSION_CATEGORIES = Array.from(new Set(PERMISSIONS.map((p) => p.category)));

export interface RoleDef {
  key: string;
  name: string;
  description: string;
  level: number;
  permissions: PermissionKey[];
}

const STAFF_BASE: PermissionKey[] = [
  'dashboard.view',
  'tasks.view_assigned',
  'tasks.update_assigned',
  'tasks.comment',
  'documents.view_own',
  'documents.upload',
  'messages.use',
  'projects.view_assigned',
];

export const ROLE_DEFINITIONS: RoleDef[] = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Unrestricted control of the platform, including roles and system settings.',
    level: 100,
    permissions: PERMISSION_KEYS,
  },
  {
    key: 'administrator',
    name: 'Administrator',
    description: 'Runs the business day to day: people, clients, tasks, projects and the website.',
    level: 90,
    permissions: PERMISSION_KEYS.filter((p) => p !== 'system.super'),
  },
  {
    key: 'director',
    name: 'Director',
    description: 'Strategic oversight: reports, projects, clients, opportunities and approvals.',
    level: 80,
    permissions: [
      'dashboard.view',
      'users.view',
      'team.view',
      'team.monitor',
      'tasks.view_any',
      'tasks.create',
      'tasks.assign',
      'tasks.update_any',
      'tasks.approve',
      'tasks.comment',
      'projects.view_any',
      'projects.manage',
      'clients.view',
      'clients.manage',
      'service_requests.view',
      'service_requests.manage',
      'jobs.view',
      'applications.view',
      'opportunities.manage',
      'documents.view_any',
      'documents.upload',
      'messages.use',
      'announcements.manage',
      'reports.view',
      'reports.export',
      'content.manage',
      'media.manage',
      'leadership.manage',
      'testimonials.manage',
      'faqs.manage',
      'audit.view',
    ],
  },
  {
    key: 'manager',
    name: 'Manager',
    description: 'Coordinates staff, assigns work, reviews submissions and approves delivery.',
    level: 70,
    permissions: [
      ...STAFF_BASE,
      'tasks.view_any',
      'tasks.create',
      'tasks.assign',
      'tasks.update_any',
      'tasks.approve',
      'tasks.delete',
      'team.view',
      'team.monitor',
      'users.view',
      'announcements.manage',
      'projects.view_any',
      'projects.manage',
      'jobs.view',
      'applications.view',
      'clients.view',
      'service_requests.view',
      'documents.view_any',
      'reports.view',
      'media.manage',
    ],
  },
  {
    key: 'hr',
    name: 'HR / Recruitment',
    description: 'Owns recruitment: vacancies, applications, interviews and onboarding.',
    level: 70,
    permissions: [
      ...STAFF_BASE,
      'users.view',
      'users.create',
      'users.update',
      'users.disable',
      'jobs.view',
      'jobs.manage',
      'applications.view',
      'applications.manage',
      'onboarding.manage',
      'departments.manage',
      'documents.view_any',
      'team.view',
      'announcements.manage',
      'reports.view',
      'tasks.create',
      'tasks.assign',
      'tasks.view_any',
      'tasks.update_any',
    ],
  },
  {
    key: 'virtual_assistant',
    name: 'Virtual Assistant / Task Manager',
    description: 'Assigns and monitors work, reviews submissions and reports on progress — without full administrator access.',
    level: 60,
    permissions: [
      ...STAFF_BASE,
      'tasks.view_any',
      'tasks.create',
      'tasks.assign',
      'tasks.update_any',
      'tasks.approve',
      'tasks.comment',
      'tasks.delete',
      'team.view',
      'team.monitor',
      'users.view',
      'announcements.manage',
      'projects.view_any',
      'clients.view',
      'service_requests.view',
      'jobs.view',
      'applications.view',
      'documents.view_any',
      'reports.view',
      'media.manage',
    ],
  },
  {
    key: 'business_development',
    name: 'Business Development',
    description: 'Builds the pipeline: service requests, clients, opportunities and partnerships.',
    level: 50,
    permissions: [
      ...STAFF_BASE,
      'clients.view',
      'clients.manage',
      'service_requests.view',
      'service_requests.manage',
      'projects.view_any',
      'tasks.create',
      'tasks.assign',
      'tasks.view_any',
      'team.view',
      'reports.view',
    ],
  },
  {
    key: 'marketing',
    name: 'Marketing',
    description: 'Produces campaigns, brand assets and content for the company and clients.',
    level: 50,
    permissions: [
      ...STAFF_BASE,
      'projects.view_any',
      'team.view',
      'media.manage',
      'content.manage',
      'testimonials.manage',
      'faqs.manage',
      'tasks.create',
      'tasks.view_any',
    ],
  },
  {
    key: 'cold_caller',
    name: 'Cold Caller',
    description: 'Outbound calling and lead generation; works assigned call campaigns.',
    level: 40,
    permissions: [...STAFF_BASE, 'team.view'],
  },
  {
    key: 'staff',
    name: 'General Staff',
    description: 'Company team member: receives tasks, submits work and collaborates.',
    level: 40,
    permissions: [...STAFF_BASE, 'team.view'],
  },
  {
    key: 'client',
    name: 'Client',
    description: 'External customer: submits requests, follows projects and approves deliverables.',
    level: 20,
    permissions: [
      'dashboard.view',
      'service_requests.view',
      'projects.view_assigned',
      'documents.view_own',
      'documents.upload',
      'messages.use',
      'tasks.view_assigned',
    ],
  },
  {
    key: 'applicant',
    name: 'Applicant',
    description: 'Candidate following the status of a job application.',
    level: 10,
    permissions: ['dashboard.view', 'documents.view_own', 'messages.use'],
  },
];

export const ROLE_KEYS = ROLE_DEFINITIONS.map((r) => r.key);

export function roleLabel(key: string): string {
  return ROLE_DEFINITIONS.find((r) => r.key === key)?.name ?? key;
}

export function defaultPermissionsFor(roleKey: string): PermissionKey[] {
  return ROLE_DEFINITIONS.find((r) => r.key === roleKey)?.permissions ?? [];
}

/** Where a user lands after signing in, based on what they are allowed to do. */
export function landingPathFor(permissions: Set<string>, roleKey: string): string {
  if (roleKey === 'client') return '/dashboard/my-work';
  if (roleKey === 'applicant') return '/dashboard/my-applications';
  if (permissions.has('dashboard.view') && permissions.size > 2) return '/dashboard';
  return '/dashboard/my-day';
}

export const APPLICATION_STATUSES = [
  'new',
  'under_review',
  'shortlisted',
  'interview',
  'approved',
  'invitation_sent',
  'registration',
  'onboarding',
  'accepted',
  'rejected',
  'archived',
] as const;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  approved: 'Approved',
  invitation_sent: 'Invitation Sent',
  registration: 'Registration',
  onboarding: 'Onboarding',
  accepted: 'Accepted',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const TASK_STATUSES = [
  'pending',
  'on_it',
  'in_progress',
  'submitted',
  'approved',
  'changes_required',
  'resubmitted',
  'blocked',
  'cancelled',
  'overdue',
] as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  on_it: "I'm On It",
  in_progress: 'In Progress',
  submitted: 'Submitted',
  approved: 'Approved',
  changes_required: 'Changes Required',
  resubmitted: 'Resubmitted',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
};

export const PROJECT_STATUSES = ['planning', 'active', 'review', 'completed', 'on_hold', 'cancelled'] as const;

export const SERVICE_REQUEST_STATUSES = [
  'new',
  'reviewing',
  'assigned',
  'in_progress',
  'review',
  'completed',
  'rejected',
  'cancelled',
] as const;

export const SERVICE_REQUEST_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const OPPORTUNITY_CATEGORIES = [
  { key: 'business_opportunity', label: 'Business opportunity' },
  { key: 'partnership', label: 'Partnership' },
  { key: 'project', label: 'Project' },
  { key: 'investment_information', label: 'Investment information' },
  { key: 'investment_product', label: 'Investment product (regulated)' },
] as const;

export const DOCUMENT_CATEGORIES = [
  { key: 'cv', label: 'CVs' },
  { key: 'contract', label: 'Contracts' },
  { key: 'staff_document', label: 'Staff documents' },
  { key: 'client_document', label: 'Client documents' },
  { key: 'project_file', label: 'Project files' },
  { key: 'application', label: 'Applications' },
  { key: 'company_document', label: 'Company documents' },
  { key: 'report', label: 'Reports' },
] as const;
