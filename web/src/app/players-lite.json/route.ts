import { formatStat } from '@/lib/format';
import { loadData } from '@/server/data';

export const dynamic = 'force-static';

/** [id, name, team, PTS, REB, AST, Game Score], numbers already formatted. */
export type LitePlayer = [number, string, string, string, string, string, string];

/**
 * A few numbers per player, for the "Your players" strip on the home page.
 * Fetched only by readers who follow someone.
 */
export function GET() {
  const { players } = loadData();
  const rows: LitePlayer[] = players.players.map((p) => [
    p.id,
    p.name,
    p.team,
    formatStat('pts', p.s.pts),
    formatStat('reb', p.s.reb),
    formatStat('ast', p.s.ast),
    formatStat('game_score', p.s.game_score),
  ]);
  return Response.json(rows);
}
