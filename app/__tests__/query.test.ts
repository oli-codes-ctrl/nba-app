import type { Player } from '@/data/types';
import { queryPlayers } from '@/players/query';
import { STAT_IDS, type StatId } from '@/stats/catalog';
import type { AttemptRules } from '@/stats/samples';

function player(id: number, name: string, searchName: string, q: boolean, stats: Partial<Record<StatId, number | null>>): Player {
  const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, stats[sid] ?? 0])) as Record<StatId, number | null>;
  for (const [k, v] of Object.entries(stats)) s[k as StatId] = v ?? null;
  return { id, name, searchName, team: 'BOS', teams: ['BOS'], conf: 'East', pos: 'G', q, s };
}

const players = [
  player(1, 'Luka Dončić', 'luka doncic', true, { pts: 30, tov: 4, fg3_pct: 35 }),
  player(2, 'Nikola Jokić', 'nikola jokic', true, { pts: 28, tov: 3, fg3_pct: null }),
  player(3, 'Bench Guy', 'bench guy', false, { pts: 40, tov: 1, fg3_pct: 50 }),
  player(4, 'Another Luka', 'another luka', true, { pts: 28, tov: 2, fg3_pct: 40 }),
];

const names = (ps: Player[]) => ps.map((p) => p.name);

describe('queryPlayers', () => {
  it('shows qualified players sorted high to low by default', () => {
    expect(names(queryPlayers(players, { search: '', sort: 'pts', qualifiedOnly: true }))).toEqual([
      'Luka Dončić', 'Another Luka', 'Nikola Jokić',
    ]);
  });

  it('includes unqualified players when the filter is off', () => {
    expect(names(queryPlayers(players, { search: '', sort: 'pts', qualifiedOnly: false }))[0]).toBe('Bench Guy');
  });

  it('sorts lower-is-better stats low to high', () => {
    expect(names(queryPlayers(players, { search: '', sort: 'tov', qualifiedOnly: true }))).toEqual([
      'Another Luka', 'Nikola Jokić', 'Luka Dončić',
    ]);
  });

  it('puts missing values last', () => {
    const result = queryPlayers(players, { search: '', sort: 'fg3_pct', qualifiedOnly: true });
    expect(result[result.length - 1].name).toBe('Nikola Jokić');
  });

  describe('sorted by a shooting percentage', () => {
    const rules: AttemptRules = { fg3_pct: { by: 'fg3a', min: 12 } };
    const att = (fg3a: number) => ({ fga: 100, fg2a: 100 - fg3a, fg3a, fta: 20 });
    // A center who is 1 for 1 from three, and two real shooters.
    const shooters = [
      { ...player(10, 'Big Man', 'big man', true, { fg3_pct: 100 }), att: att(1) },
      { ...player(11, 'Shooter', 'shooter', true, { fg3_pct: 41 }), att: att(60) },
      { ...player(12, 'Wing', 'wing', true, { fg3_pct: 38 }), att: att(45) },
      { ...player(13, 'Bench Gunner', 'bench gunner', false, { fg3_pct: 45 }), att: att(30) },
    ];

    it('ranks only players with enough attempts in the qualified list', () => {
      expect(names(queryPlayers(shooters, { search: '', sort: 'fg3_pct', qualifiedOnly: true, rules }))).toEqual([
        'Shooter', 'Wing',
      ]);
    });

    it('lists everyone with the filter off, small samples after real ones', () => {
      expect(names(queryPlayers(shooters, { search: '', sort: 'fg3_pct', qualifiedOnly: false, rules }))).toEqual([
        'Bench Gunner', 'Shooter', 'Wing', 'Big Man',
      ]);
    });

    it('still finds a small-sample player by name', () => {
      expect(names(queryPlayers(shooters, { search: 'big', sort: 'fg3_pct', qualifiedOnly: true, rules }))).toEqual([
        'Big Man',
      ]);
    });
  });

  it('searches every player, accent-insensitive', () => {
    expect(names(queryPlayers(players, { search: 'DONČ', sort: 'pts', qualifiedOnly: true }))).toEqual(['Luka Dončić']);
    expect(names(queryPlayers(players, { search: 'jokic', sort: 'pts', qualifiedOnly: true }))).toEqual(['Nikola Jokić']);
    expect(names(queryPlayers(players, { search: 'bench', sort: 'pts', qualifiedOnly: true }))).toEqual(['Bench Guy']);
  });

  it('does not reorder the input array', () => {
    const before = names(players);
    queryPlayers(players, { search: '', sort: 'pts', qualifiedOnly: false });
    expect(names(players)).toEqual(before);
  });
});
