import type { MetadataRoute } from 'next';

import { playerPath, teamPath } from '@/lib/routes';
import { SITE } from '@/lib/site';
import { loadData } from '@/server/data';
import { CATALOG, STAT_IDS } from '@/stats/catalog';
import { TEAMS } from '@/theme/teams';

export const dynamic = 'force-static';

/** /sitemap.xml: every canonical page, stamped with the data's games-through date. */
export default function sitemap(): MetadataRoute.Sitemap {
  const data = loadData();
  const at = (path: string) => `${SITE.url}${SITE.basePath}${path === '/' ? '/' : `${path}/`}`;
  const lastModified = data.through;
  const pages = [
    '/',
    '/players',
    '/teams',
    '/compare',
    '/explore',
    '/games',
    '/games/daily',
    '/games/higher-lower',
    '/games/box-score',
    '/games/trophies',
    '/glossary',
    '/about',
    ...data.players.players.map(playerPath),
    ...Object.keys(TEAMS).map(teamPath),
    ...STAT_IDS.filter((id) => CATALOG[id].ranked).map((id) => `/stats/${id}`),
  ];
  return pages.map((path) => ({ url: at(path), lastModified }));
}
