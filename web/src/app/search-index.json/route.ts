import type { PlayerEntry, SearchIndex, TeamEntry } from '@/lib/search';
import { loadData } from '@/server/data';
import { TEAMS } from '@/theme/teams';

export const dynamic = 'force-static';

/** The search index as a static file: about 8 KB compressed, fetched when search first opens. */
export function GET() {
  const { players } = loadData();
  const sorted = [...players.players].sort(
    (a, b) => Number(b.q) - Number(a.q) || (b.s.game_score ?? -99) - (a.s.game_score ?? -99) || a.id - b.id,
  );
  const index: SearchIndex = {
    players: sorted.map((p): PlayerEntry => [p.id, p.name, p.searchName, p.team, p.pos]),
    teams: Object.entries(TEAMS).map(([abbr, t]): TeamEntry => [abbr, t.name]),
  };
  return Response.json(index);
}
