import { packComparePlayer, VALUE_STATS, type CompareData } from '@/components/compare/compareData';
import { VERSUS_STATS } from '@/players/versus';
import { loadData } from '@/server/data';

export const dynamic = 'force-static';

/**
 * What the compare page needs for any two players, as one static file:
 * the head-to-head stats with their percentiles and ranges, the style stats
 * and the attempt totals. Fetched only on the compare page.
 */
export function GET() {
  const { players } = loadData();
  const sorted = [...players.players].sort(
    (a, b) => Number(b.q) - Number(a.q) || (b.s.game_score ?? -99) - (a.s.game_score ?? -99) || a.id - b.id,
  );
  const data: CompareData = {
    values: [...VALUE_STATS],
    ranked: [...VERSUS_STATS],
    rules: players.minAttempts ?? {},
    players: sorted.map(packComparePlayer),
  };
  return Response.json(data);
}
