/** Site identity. The name is a working name; change it here only. */
export const SITE = {
  name: 'Hoops Analytics',
  tagline: 'Settle it with stats.',
  description:
    'Pro basketball stats for fans who argue about it: every player ranked fairly, explained in plain English, with honest ranges instead of hot takes.',
  /** Absolute origin for canonical links and share previews. Set NEXT_PUBLIC_SITE_URL when deploying. */
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
} as const;

export const NAV_LINKS = [
  { href: '/players', label: 'Players' },
  { href: '/teams', label: 'Teams' },
  { href: '/compare', label: 'Compare' },
  { href: '/explore', label: 'Explore' },
  { href: '/games', label: 'Games' },
] as const;
