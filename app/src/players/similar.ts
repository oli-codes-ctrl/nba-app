/**
 * "Plays like": players with the closest statistical profile, using the
 * pipeline's percentiles so every stat is on the same 0-100 scale.
 */
import type { Player } from '@/data/types';
import type { StatId } from '@/stats/catalog';

/** Style more than quality: what a player does, not only how well. */
export const PROFILE_STATS: readonly StatId[] = [
  'pts36', 'reb36', 'ast36', 'oreb', 'stl', 'blk', 'tov', 'fg3a', 'fta', 'fg3_pct', 'ts_pct',
];

export type Similar = { player: Player; match: number };

/** Root-mean-square percentile gap, turned into a 0-100 match. */
export function similarity(a: Player, b: Player): number | null {
  let sum = 0;
  let n = 0;
  for (const s of PROFILE_STATS) {
    const pa = a.pct?.[s];
    const pb = b.pct?.[s];
    if (pa == null || pb == null) continue;
    sum += (pa - pb) ** 2;
    n++;
  }
  if (n < PROFILE_STATS.length - 2) return null;
  return Math.max(0, 100 - Math.sqrt(sum / n));
}

export function similarPlayers(player: Player, players: readonly Player[], n = 3): Similar[] {
  if (!player.q) return [];
  const out: Similar[] = [];
  for (const other of players) {
    if (other.id === player.id || !other.q) continue;
    const match = similarity(player, other);
    if (match != null) out.push({ player: other, match });
  }
  return out.sort((a, b) => b.match - a.match || a.player.id - b.player.id).slice(0, n);
}
