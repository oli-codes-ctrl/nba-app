/**
 * Search over players and teams. The index is built once at build time
 * (app/search-index.json) and fetched the first time search opens. Matching
 * is accent-insensitive on both sides: `fold` here, `searchName` from the pipeline.
 */
import { fold } from '@/lib/fold';

/** [id, name, searchName, team, position] in best-first order (qualified, then Game Score). */
export type PlayerEntry = [number, string, string, string, string];
/** [abbreviation, name] */
export type TeamEntry = [string, string];
export type SearchIndex = { players: PlayerEntry[]; teams: TeamEntry[] };

export type SearchResults = { players: PlayerEntry[]; teams: TeamEntry[] };

/** Lower sorts first: whole-name prefix, then a word prefix, then anywhere. */
function score(haystack: string, tokens: readonly string[]): number | null {
  if (!tokens.every((t) => haystack.includes(t))) return null;
  if (haystack.startsWith(tokens.join(' '))) return 0;
  const words = haystack.split(' ');
  return tokens.every((t) => words.some((w) => w.startsWith(t))) ? 1 : 2;
}

export function search(index: SearchIndex, query: string, limits = { players: 7, teams: 3 }): SearchResults {
  const tokens = fold(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return { players: index.players.slice(0, limits.players), teams: [] };

  const players = index.players
    .map((p, order) => ({ p, order, score: score(p[2], tokens) }))
    .filter((r): r is { p: PlayerEntry; order: number; score: number } => r.score != null)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, limits.players)
    .map((r) => r.p);

  const teams = index.teams
    .map((t, order) => ({ t, order, score: score(fold(`${t[1]} ${t[0]}`), tokens) }))
    .filter((r): r is { t: TeamEntry; order: number; score: number } => r.score != null)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, limits.teams)
    .map((r) => r.t);

  return { players, teams };
}
