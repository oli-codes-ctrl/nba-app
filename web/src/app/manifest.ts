import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';
import { tok } from '@/og/card';

export const dynamic = 'force-static';

/** /manifest.webmanifest: name, colors and icons for "Add to Home Screen". */
export default function manifest(): MetadataRoute.Manifest {
  const base = SITE.basePath;
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: tok('canvas'),
    theme_color: tok('canvas'),
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
