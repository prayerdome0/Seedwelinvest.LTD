import type { Metadata } from 'next';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { requireUser } from '@/lib/auth/guards';
import { DASHBOARD_NAV, filterNav } from '@/lib/nav';
import { unreadCount } from '@/lib/notifications';
import { getCompany } from '@/lib/settings';
import { getAnnouncements } from '@/lib/data/site';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Workplace',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/dashboard');
  // The menu is filtered by the permissions stored in the database, never by
  // anything the browser sends.
  const groups = filterNav(DASHBOARD_NAV, new Set(user.permissions));
  const unread = unreadCount(user.id);
  const company = getCompany();
  const announcements =
    user.roleKey === 'client' ? getAnnouncements('clients', 1) : user.roleKey === 'applicant' ? getAnnouncements('applicants', 1) : getAnnouncements('staff', 1);

  return (
    <DashboardShell
      user={{
        fullName: user.fullName,
        email: user.email,
        roleName: user.roleName,
        avatarPath: user.avatarPath,
        permissions: user.permissions,
      }}
      groups={groups}
      unread={unread}
      banner={
        company.demoContent ? (
          <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 sm:px-6 lg:px-8">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              <strong className="font-semibold">Demonstration data.</strong> This workspace ships with sample people,
              tasks, applications and projects so every screen can be explored. Replace or delete them in each section
              before going live.
            </p>
          </div>
        ) : null
      }
    >
      {children}
    </DashboardShell>
  );
}
