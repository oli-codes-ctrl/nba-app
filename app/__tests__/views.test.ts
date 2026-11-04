import type { Player } from '@/data/types';
import { queryPlayers } from '@/players/query';
import { CATALOG, STAT_IDS, type StatId } from '@/stats/catalog';
import { groupNoun, hasVariants, normalized, positionGroup, positionName } from '@/stats/views';

function player(id: number, pos: string, pts: number, q = true): Player {
  const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, 10])) as Record<StatId, number | null>;
  s.pts = pts;
  s.pts36 = pts * 1.2;
  return { id, name: `P${id}`, searchName: `p${id}`, team: 'BOS', teams: ['BOS'], conf: 'East', pos, q, s };
}

describe('scaled views', () => {
  it('maps counting stats to their per-36 and per-100 versions', () => {
    expect(normalized('pts', 'game')).toBe('pts');
    expect(normalized('pts', 'per36')).toBe('pts36');
    expect(normalized('ast', 'per100')).toBe('ast100');
    expect(normalized('tov', 'per100')).toBe('tov100');
  });

  it('leaves percentages, ratings and minutes alone', () => {
    for (const stat of ['ts_pct', 'fg3_pct', 'game_score', 'mpg'] as const) {
      expect(hasVariants(stat)).toBe(false);
      expect(normalized(stat, 'per36')).toBe(stat);
    }
  });

  it('only maps to stats that exist, keeping direction', () => {
    for (const stat of STAT_IDS) {
      for (const n of ['per36', 'per100'] as const) {
        const scaled = normalized(stat, n);
        expect(STAT_IDS).toContain(scaled);
        expect(CATALOG[scaled].lowerIsBetter).toBe(CATALOG[stat].lowerIsBetter);
      }
    }
  });
});

describe('positions', () => {
  it('names the three groups ESPN uses', () => {
    expect(positionGroup('G')).toBe('G');
    expect(positionGroup('PG')).toBeNull();
    expect(groupNoun('C')).toBe('centers');
    expect(positionName('F')).toBe('Forward');
    expect(positionName('XX')).toBe('XX');
  });

  it('filters the browsing list by position, but a search covers everyone', () => {
    const ps = [player(1, 'G', 20), player(2, 'C', 25), player(3, 'G', 15), player(4, 'F', 30)];
    const guards = queryPlayers(ps, { search: '', sort: 'pts', qualifiedOnly: true, position: 'G' });
    expect(guards.map((p) => p.id)).toEqual([1, 3]);
    const everyone = queryPlayers(ps, { search: 'p', sort: 'pts', qualifiedOnly: true, position: 'G' });
    expect(everyone.map((p) => p.id)).toEqual([4, 2, 1, 3]);
    const per36 = queryPlayers(ps, { search: '', sort: normalized('pts', 'per36'), qualifiedOnly: true, position: null });
    expect(per36[0].id).toBe(4);
  });
});
