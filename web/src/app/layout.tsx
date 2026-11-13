import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { TrophyNotice } from '@/components/games/TrophyNotice';
import { TopNav } from '@/components/shell/TopNav';
import { SITE } from '@/lib/site';

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
  other: { 'page-type': 'software', 'site-kind': 'software' },
};

export const viewport: Viewport = {
  themeColor: '#010102',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} data-type="software">
      <body>
        <TopNav />
        {children}
        <TrophyNotice />
      </body>
    </html>
  );
}
