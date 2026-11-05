import type { Player } from '@/data/types';
import { CARD_STATS, cardInsights, cardRows, ELITE, poolValues, WEAK, type CardRow } from '@/players/card';
import { comps, cosine, drivers, STYLE_STATS, styleVectors } from '@/players/similar';
import { STAT_IDS, type StatId } from '@/stats/catalog';

function player(id: number, stats: Partial<Record<StatId, number | null>> = {}, extra: Partial<Player> = {}): Player {
  const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, 10])) as Record<StatId, number | null>;
  Object.assign(s, stats);
  return { id, name: `P${id}`, searchName: `p${id}`, team: 'BOS', teams: ['BOS'], conf: 'East', pos: 'G', q: true, s, ...extra };
}

describe('player card rows', () => {
  // Eleven guards scoring 10..20 a game, each with a published percentile.
  const pool = Array.from({ length: 11 }, (_, i) =>
    player(i + 1, { pts: 10 + i, tov_pct: 10 + i }, { pct: { pts: 50, tov_pct: 50 }, pctPos: { pts: 50, tov_pct: 50 } }),
  );

  it('ranks against the chosen pool and turns his likely range into a rank band', () => {
    const me = player(99, { pts: 18 }, { pctPos: { pts: 77, tov_pct: 30 }, ci: { pts: [15, 21] } });
    const rows = cardRows(me, pool, 'G');
    expect(rows.map((r) => r.stat)).toEqual(CARD_STATS);
    const pts = rows.find((r) => r.stat === 'pts')!;
    expect(pts.better).toBe(77);
    // 15 sits mid-pack (5.5 of 11 below), 21 is above everyone.
    expect(pts.band![0]).toBeCloseTo(50);
    expect(pts.band![1]).toBe(100);
    // Fewer turnovers is better: 30th percentile by value is better than 70%.
    expect(rows.find((r) => r.stat === 'tov_pct')!.better).toBe(70);
    // Not ranked: no percentile, no band.
    const ft = rows.find((r) => r.stat === 'ft_pct')!;
    expect(ft.better).toBeNull();
    expect(ft.band).toBeNull();
    expect(rows.find((r) => r.stat === 'usg_pct')!.neutral).toBe(true);
  });

  it('pools only players ranked in that stat and group', () => {
    const forward = player(50, { pts: 99 }, { pos: 'F', pctPos: { pts: 99 } });
    expect(poolValues([...pool, forward], 'pts', 'G')).toHaveLength(11);
    expect(poolValues([...pool, forward], 'pts', null)).toHaveLength(11); // the forward has no all-player percentile
  });
});

describe('gated insights', () => {
  const row = (stat: StatId, better: number, band: [number, number] | null, neutral = false): CardRow => ({
    stat,
    label: stat,
    value: 1,
    better,
    band,
    neutral,
  });

  it('calls a stat elite or weak only when the whole range agrees', () => {
    const rows = [
      row('pts', 97, [ELITE, 100]),
      row('ts_pct', 95, [40, 99]), // great so far, but could be luck
      row('tov_pct', 5, [1, WEAK]),
      row('stl_pct', 8, [2, 45]), // poor so far, not settled
      row('ast_pct', 60, [45, 75]),
    ];
    const { elite, weak, unsettled } = cardInsights(rows);
    expect(elite.map((r) => r.stat)).toEqual(['pts']);
    expect(weak.map((r) => r.stat)).toEqual(['tov_pct']);
    expect(unsettled.map((r) => r.stat)).toEqual(['ts_pct', 'stl_pct']);
  });

  it('never judges roles, and never calls a stat without a range elite', () => {
    const { elite, weak, unsettled } = cardInsights([row('usg_pct', 99, [95, 100], true), row('game_score', 99, null)]);
    expect([...elite, ...weak]).toEqual([]);
    // The league's best Game Score with no range yet is named, not dropped.
    expect(unsettled.map((r) => r.stat)).toEqual(['game_score']);
  });
});

describe("Who's he like?", () => {
  const style = (values: Partial<Record<StatId, number>>) => Object.fromEntries(STYLE_STATS.map((s) => [s, values[s] ?? 10]));
  const players = [
    player(1, style({ usg_pct: 30, ast_pct: 40 })), // star playmaker
    player(2, style({ usg_pct: 25, ast_pct: 32 })), // smaller version of the same type
    player(3, style({ usg_pct: 12, ast_pct: 8, blk_pct: 30, oreb_pct: 30 })), // big man
    player(4, style({ usg_pct: 15, ast_pct: 15 })),
    player(5, style({ usg_pct: 14, ast_pct: 12, fg3a_rate: 20 })),
    player(6, style({ usg_pct: 30, ast_pct: 40 }), { q: false }), // not qualified
    player(7, { ...style({}), ts_pct: null }), // missing a style stat
  ];

  it('measures shape, not size', () => {
    expect(cosine([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosine([1, 2], [-1, -2])).toBeCloseTo(-1);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });

  it('finds the same type first and says why', () => {
    const list = comps(players[0], players, undefined, 2);
    expect(list[0].player.id).toBe(2);
    expect(list[0].match).toBeGreaterThan(0.9);
    expect(list[0].drivers.map((d) => d.text)).toEqual(expect.arrayContaining(['high usage', 'lots of assists']));
    expect(list.every((c) => c.player.id !== 6 && c.player.id !== 7)).toBe(true);
  });

  it('only counts reasons where both sit clearly on the same side', () => {
    expect(drivers([2, -2, 0.1, 1], [1.5, 1, 3, 1]).map((d) => d.stat)).toEqual([STYLE_STATS[0], STYLE_STATS[3]]);
  });

  it('skips players who cannot be compared yet', () => {
    expect(styleVectors(players, undefined).has(6)).toBe(false);
    expect(comps(players[6], players, undefined)).toEqual([]);
  });
});
