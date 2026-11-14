/**
 * Page metadata in one shape. Next replaces (does not merge) a page's
 * `openGraph` and `twitter` with the layout's, so every page builds the full
 * set here: canonical link, share title and description, site name, and its
 * own preview image (drawn by app/og/[kind]/[file]/route.ts).
 */
import type { Metadata } from 'next';

import { CATALOG, type StatId } from '@/stats/catalog';

import { SITE } from './site';

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Preview image paths, one per page or thing. */
export const ogImage = {
  page: (key: string) => `/og/pages/${key}.png`,
  player: (slug: string) => `/og/players/${slug}.png`,
  team: (abbr: string) => `/og/teams/${abbr.toLowerCase()}.png`,
  stat: (stat: StatId) => `/og/stats/${stat}.png`,
};

type PageMeta = {
  /** The tab title; the layout appends the site name unless it is absolute. */
  title: string | { absolute: string };
  description: string;
  /** Canonical path, e.g. /players. */
  path: string;
  /** The title shown on a shared link; defaults to the tab title. Usually the page's question. */
  share?: string;
  image: string;
  imageAlt: string;
  type?: 'website' | 'profile';
  noindex?: boolean;
};

export function pageMeta(m: PageMeta): Metadata {
  const share = m.share ?? (typeof m.title === 'string' ? m.title : m.title.absolute);
  const images = [{ url: m.image, ...OG_SIZE, alt: m.imageAlt, type: 'image/png' }];
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: m.path },
    openGraph: {
      type: m.type ?? 'website',
      siteName: SITE.name,
      locale: 'en_US',
      title: share,
      description: m.description,
      url: m.path,
      images,
    },
    twitter: { card: 'summary_large_image', title: share, description: m.description, images },
    ...(m.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** The question a stat's page and preview ask: best, fewest, or (for a role) highest. */
export function statQuestion(stat: StatId): string {
  const def = CATALOG[stat];
  const label = def.label.charAt(0).toLowerCase() + def.label.slice(1);
  if (def.neutral) return `Who has the highest ${label}?`;
  return def.lowerIsBetter ? `Who has the fewest ${label}?` : `Who has the best ${label}?`;
}
