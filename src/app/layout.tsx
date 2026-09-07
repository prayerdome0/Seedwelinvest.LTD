import type { Metadata, Viewport } from 'next';
// Self-hosted variable font: no external request on first paint.
import '@fontsource-variable/inter';
import './globals.css';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Seedwel Investment Limited — Business, Digital & Talent Services in Zambia',
    template: '%s | Seedwel Investment Limited',
  },
  description:
    'Seedwel Investment Limited is a Zambian company delivering digital solutions, branding and creative services, business support, talent and recruitment, and practical skills development.',
  applicationName: 'Seedwel Investment Limited',
  keywords: [
    'Seedwel Investment Limited',
    'business services Zambia',
    'digital solutions Zambia',
    'business development Zambia',
    'virtual assistant Zambia',
    'digital services Zambia',
    'jobs in Zambia',
    'business opportunities Zambia',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Seedwel Investment Limited',
    locale: 'en_ZM',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Seedwel Investment Limited' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-default.jpg'],
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
