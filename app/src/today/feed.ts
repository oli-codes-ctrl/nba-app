/**
 * What the Today tab shows. Pure functions over one data snapshot.
 */
import type { GameLine, Player } from '@/data/types';
import { formatStat } from '@/lib/format';
import { CATALOG, type StatId } from '@/stats/catalog';

/** Latest games, best Game Score first. */
export function topGames(players: readonly Player[], n = 8): (Player & { g: GameLine })[] {
  return players
    .filter((p): p is Player & { g: GameLine } => p.g != null && p.g.game_score != null)
    .sort((a, b) => (b.g.game_score ?? 0) - (a.g.game_score ?? 0) || a.id - b.id)
    .slice(0, n);
}

/** "38 PTS · 9 REB · 7 AST", skipping small numbers after the first three. */
export function boxLine(g: GameLine): string {
  const parts = [`${g.pts ?? 0} PTS`, `${g.reb ?? 0} REB`, `${g.ast ?? 0} AST`];
  if ((g.stl ?? 0) >= 3) parts.push(`${g.stl} STL`);
  if ((g.blk ?? 0) >= 3) parts.push(`${g.blk} BLK`);
  if ((g.fg3m ?? 0) >= 5) parts.push(`${g.fg3m} 3PM`);
  return parts.join(' · ');
}

export type FormChange = { player: Player; recent: number; season: number; change: number; games: number };

const MIN_RECENT_GAMES = 2;
const MIN_SEASON_PTS = 8;

/**
 * Biggest scoring changes over the recent window against the season average.
 * Heating up = largest rise, cooling off = largest drop.
 */
export function formChanges(players: readonly Player[], n = 5): { hot: FormChange[]; cold: FormChange[] } {
  const rows: FormChange[] = [];
  for (const p of players) {
    const recent = p.r?.pts;
    const season = p.s.pts;
    if (!p.q || recent == null || season == null || (p.r?.gp ?? 0) < MIN_RECENT_GAMES) continue;
    if (season < MIN_SEASON_PTS && recent < MIN_SEASON_PTS) continue;
    rows.push({ player: p, recent, season, change: recent - season, games: p.r?.gp ?? 0 });
  }
  const byChange = [...rows].sort((a, b) => b.change - a.change || a.player.id - b.player.id);
  return {
    hot: byChange.filter((r) => r.change > 0).slice(0, n),
    cold: byChange.filter((r) => r.change < 0).reverse().slice(0, n),
  };
}

/**
 * Top players in a stat, best first (fewest for turnovers and fouls). Only
 * players ranked in it count: qualified, and with enough attempts for a
 * shooting percentage.
 */
export function leaders(players: readonly Player[], stat: StatId, n = 3): Player[] {
  const sign = CATALOG[stat].lowerIsBetter ? 1 : -1;
  return players
    .filter((p) => p.pct?.[stat] != null && p.s[stat] != null)
    .sort((a, b) => sign * ((a.s[stat] ?? 0) - (b.s[stat] ?? 0)) || a.id - b.id)
    .slice(0, n);
}

export const LEADER_STATS: readonly StatId[] = ['pts', 'reb', 'ast', 'stl', 'blk', 'fg3m', 'ts_pct', 'game_score'];

export type Fact = { text: string; playerIds: number[] };

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const v = (p: Player, s: StatId) => formatStat(s, p.s[s]);
const names = (ps: readonly Player[]) =>
  ps.length <= 2 ? ps.map((p) => p.name).join(' and ') : `${ps.slice(0, -1).map((p) => p.name).join(', ')} and ${ps[ps.length - 1].name}`;

type FactMaker = (q: Player[], seed: number) => Fact | null;

const FACTS: FactMaker[] = [
  // An all-around club.
  (q) => {
    const club = q.filter((p) => (p.s.pts ?? 0) >= 20 && (p.s.reb ?? 0) >= 5 && (p.s.ast ?? 0) >= 5);
    if (club.length === 0 || club.length > 6) return null;
    return {
      text: `${club.length === 1 ? 'Only one player averages' : `Only ${club.length} players average`} 20 points, 5 rebounds and 5 assists: ${names(club)}.`,
      playerIds: club.map((p) => p.id),
    };
  },
  // Sharpest high-volume shooter from three.
  (q) => {
    const shooters = q.filter((p) => (p.s.fg3a ?? 0) >= 5 && p.s.fg3_pct != null);
    const best = leaders(shooters, 'fg3_pct', 1)[0];
    if (!best) return null;
    return {
      text: `${best.name} is making ${v(best, 'fg3_pct')} of threes, the best of anyone taking 5 or more a game.`,
      playerIds: [best.id],
    };
  },
  // Youngest 20-point scorer.
  (q) => {
    const scorers = q.filter((p) => (p.s.pts ?? 0) >= 20 && p.s.age != null);
    if (scorers.length < 2) return null;
    const youngest = [...scorers].sort((a, b) => (a.s.age ?? 0) - (b.s.age ?? 0) || a.id - b.id)[0];
    return {
      text: `At ${youngest.s.age}, ${youngest.name} is the youngest of the ${scorers.length} players scoring 20 or more a game (${v(youngest, 'pts')}).`,
      playerIds: [youngest.id],
    };
  },
  // Big man passing.
  (q) => {
    const bigs = q.filter((p) => p.pos === 'C');
    const best = leaders(bigs, 'ast', 1)[0];
    if (!best || (best.s.ast ?? 0) < 3) return null;
    return {
      text: `${best.name} leads all centers with ${v(best, 'ast')} assists a game.`,
      playerIds: [best.id],
    };
  },
  // Stocks: steals plus blocks.
  (q) => {
    const ranked = [...q].sort(
      (a, b) => (b.s.stl ?? 0) + (b.s.blk ?? 0) - ((a.s.stl ?? 0) + (a.s.blk ?? 0)) || a.id - b.id,
    );
    const best = ranked[0];
    if (!best) return null;
    const stocks = ((best.s.stl ?? 0) + (best.s.blk ?? 0)).toFixed(1);
    return {
      text: `${best.name} leads the league in “stocks”, steals plus blocks, with ${stocks} a game.`,
      playerIds: [best.id],
    };
  },
  // A rotating stat leader.
  (q, seed) => {
    const stat = LEADER_STATS[seed % LEADER_STATS.length];
    const [first, second] = leaders(q, stat, 2);
    if (!first || !second) return null;
    return {
      text: `${first.name} leads in ${CATALOG[stat].label.toLowerCase()} at ${v(first, stat)}. ${second.name} is next at ${v(second, stat)}.`,
      playerIds: [first.id, second.id],
    };
  },
];

/** One fact per date, the same for everyone that day. Skips facts the data can't support. */
export function factOfTheDay(players: readonly Player[], date: string): Fact | null {
  const qualified = players.filter((p) => p.q);
  const seed = hash(date);
  for (let i = 0; i < FACTS.length; i++) {
    const fact = FACTS[(seed + i) % FACTS.length](qualified, seed);
    if (fact) return fact;
  }
  return null;
}
