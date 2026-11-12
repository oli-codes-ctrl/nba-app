/**
 * Every internal URL is built here, so each player, team and stat has one
 * canonical address. Player URLs end in the ESPN id, which keeps a link
 * stable if the spelling of a name changes.
 */
import { fold } from '@/lib/fold';
import type { StatId } from '@/stats/catalog';
import type { PositionGroup } from '@/stats/views';

export function playerSlug(p: { id: number; name: string }): string {
  const words = fold(p.name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return words ? `${words}-${p.id}` : String(p.id);
}

/** The id at the end of a player slug; null when there is none. */
export function idFromSlug(slug: string): number | null {
  const match = /(?:^|-)(\d+)$/.exec(slug);
  return match ? Number(match[1]) : null;
}

export function playerPath(p: { id: number; name: string }): string {
  return `/players/${playerSlug(p)}`;
}

export function teamPath(abbr: string): string {
  return `/teams/${abbr.toLowerCase()}`;
}

export type Pool = PositionGroup | 'all';

/** One stat across the league, optionally marking a player and limiting to a position. */
export function statPath(stat: StatId, options: { player?: number; pos?: Pool } = {}): string {
  const query = new URLSearchParams();
  if (options.player != null) query.set('player', String(options.player));
  if (options.pos && options.pos !== 'all') query.set('pos', options.pos);
  const text = query.toString();
  return `/stats/${stat}${text ? `?${text}` : ''}`;
}

export function comparePath(a?: number, b?: number): string {
  const query = new URLSearchParams();
  if (a != null) query.set('a', String(a));
  if (b != null) query.set('b', String(b));
  const text = query.toString();
  return `/compare${text ? `?${text}` : ''}`;
}
