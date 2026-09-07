import type { Metadata } from 'next';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { getCompany } from '@/lib/settings';

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const company = getCompany();
  return {
    title: {
      default: `${company.name} — ${company.tagline}`,
      template: `%s | ${company.name}`,
    },
    description: company.seoDescription || company.description,
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const company = getCompany();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        contact={{
          email: company.email,
          phone: company.phone,
          tagline: `${company.tagline} Registered in ${company.country} · ${company.year}`,
        }}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter company={company} />
    </div>
  );
}
