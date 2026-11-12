import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { Footer } from '@/components/shell/Footer';
import { TopNav } from '@/components/shell/TopNav';
import { formatDate } from '@/lib/format';
import { SITE } from '@/lib/site';
import { loadData } from '@/server/data';

import '@/styles/tokens.css';
import '@/styles/base.css';

// Downloaded at build time and served from this site: no request to a font host.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter', axes: ['opsz'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#010102',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const { through } = loadData();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a href="#main" className="skip-link">
          Skip to Content
        </a>
        <TopNav />
        <main id="main">
          {children}
        </main>
        <Footer through={formatDate(through)} />
      </body>
    </html>
  );
}
