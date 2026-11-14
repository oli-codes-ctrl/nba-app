import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { TrophyNotice } from '@/components/games/TrophyNotice';
import { TopNav } from '@/components/shell/TopNav';
import { OG_SIZE, ogImage } from '@/lib/meta';
import { SITE } from '@/lib/site';

import '@/styles/tokens.css';
import '@/styles/base.css';

// Downloaded at build time and served from this site: no request to a font host.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter', axes: ['opsz'] });

export const metadata: Metadata = {
  // The sub-path goes into the base: Next joins page paths onto it for canonical and share URLs,
  // but does not add basePath to metadata URLs itself.
  metadataBase: new URL(`${SITE.url}${SITE.basePath}/`),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  // Fallback for pages without their own (the 404); every other page sets these through lib/meta.ts.
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: 'en_US',
    images: [{ url: ogImage.page('site'), ...OG_SIZE, alt: `${SITE.name}: ${SITE.tagline}`, type: 'image/png' }],
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: `${SITE.basePath}/icons/icon.svg`, type: 'image/svg+xml' },
      { url: `${SITE.basePath}/icons/icon-32.png`, sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: `${SITE.basePath}/icons/apple-touch-icon.png`, sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
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
