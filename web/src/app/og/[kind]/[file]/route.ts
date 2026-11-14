/**
 * Share previews as real .png files (/og/<kind>/<name>.png), drawn at build
 * time. A route handler rather than Next's opengraph-image convention, which
 * exports files without an extension that a plain static host would serve
 * with the wrong content type. Paths: lib/meta.ts.
 */
import { playerSlug } from '@/lib/routes';
import { render } from '@/og/card';
import { PAGE_CARDS, pageImage, playerImage, statImage, teamImage, type PageCard } from '@/og/images';
import { loadData } from '@/server/data';
import { CATALOG, STAT_IDS, type StatId } from '@/stats/catalog';
import { TEAMS } from '@/theme/teams';

export const dynamic = 'force-static';
export const dynamicParams = false;

type Kind = 'pages' | 'players' | 'teams' | 'stats';

export function generateStaticParams(): { kind: Kind; file: string }[] {
  const png = (name: string) => `${name}.png`;
  return [
    ...Object.keys(PAGE_CARDS).map((k) => ({ kind: 'pages' as const, file: png(k) })),
    ...loadData().players.players.map((p) => ({ kind: 'players' as const, file: png(playerSlug(p)) })),
    ...Object.keys(TEAMS).map((abbr) => ({ kind: 'teams' as const, file: png(abbr.toLowerCase()) })),
    ...STAT_IDS.filter((id) => CATALOG[id].ranked).map((id) => ({ kind: 'stats' as const, file: png(id) })),
  ];
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; file: string }> }) {
  const { kind, file } = await params;
  const name = file.replace(/\.png$/, '');
  switch (kind) {
    case 'pages':
      return render(pageImage(name as PageCard));
    case 'players': {
      const player = loadData().players.players.find((p) => playerSlug(p) === name);
      if (!player) break;
      return render(playerImage(player));
    }
    case 'teams':
      return render(teamImage(name.toUpperCase()));
    case 'stats':
      return render(statImage(name as StatId));
  }
  return new Response('Not found', { status: 404 });
}
