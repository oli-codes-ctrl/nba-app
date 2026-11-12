import type { Player } from '@/data/types';
import { buildPoints, leftOut } from '@/graphs/points';
import { versusRows } from '@/players/versus';
import { STAT_IDS, type StatId } from '@/stats/catalog';
import { attemptsShort, attemptsText, hasSample, minimumsText, sampleFor, type AttemptRules } from '@/stats/samples';
import { teamLeader } from '@/teams/team';
import { leaders } from '@/today/feed';

const RULES: AttemptRules = {
  fg_pct: { by: 'fga', min: 21 },
  fg3_pct: { by: 'fg3a', min: 11 },
  ft_pct: { by: 'fta', min: 10 },
};

/** A qualified player shaped like published data: percentiles only where the sample allows. */
function player(id: number, fg3a: number, stats: Partial<Record<StatId, number | null>> = {}): Player {
  const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, 10])) as Record<StatId, number | null>;
  Object.assign(s, { mpg: 30 }, stats);
  const att = { fga: 80, fg2a: 80 - fg3a, fg3a, fta: 30 };
  const pct = Object.fromEntries(
    STAT_IDS.filter((sid) => hasSample({ att } as Player, sid, RULES)).map((sid) => [sid, 50]),
  ) as Record<StatId, number>;
  return { id, name: `P${id}`, searchName: `p${id}`, team: 'DAL', teams: ['DAL'], conf: 'West', pos: 'C', q: true, s, att, pct };
}

describe('sample sizes', () => {
  it('describes attempts in plain English', () => {
    expect(attemptsText(1, 'fg3a')).toBe('1 three-point attempt');
    expect(attemptsText(29, 'fga')).toBe('29 shots');
    expect(attemptsText(12, 'fta')).toBe('12 free throw attempts');
    expect(attemptsShort(60, 'fg3a')).toBe('60 3PA');
  });

  it('reports the sample behind a shooting percentage, and nothing for other stats', () => {
    const p = player(1, 4);
    expect(sampleFor(p, 'fg3_pct', RULES)).toEqual({ by: 'fg3a', have: 4, need: 11, enough: false });
    expect(sampleFor(p, 'fg_pct', RULES)!.enough).toBe(true);
    expect(sampleFor(p, 'pts', RULES)).toBeNull();
    expect(hasSample(p, 'pts', RULES)).toBe(true);
  });

  it('treats data without attempt rules as before', () => {
    const p = player(1, 4);
    expect(hasSample(p, 'fg3_pct', undefined)).toBe(true);
    expect(hasSample({ ...p, att: undefined }, 'fg3_pct', RULES)).toBe(true);
  });

  it('names the minimums for the stats on a chart', () => {
    expect(minimumsText(['fg3_pct', 'pts'], RULES)).toBe('under 11 three-point attempts');
    expect(minimumsText(['fg_pct', 'ft_pct'], RULES)).toBe('under 21 shots or 10 free throw attempts');
    expect(minimumsText(['pts', 'reb'], RULES)).toBeNull();
  });
});

describe('a 1-for-1 shooter never tops a list', () => {
  // Player 1 is 1 for 1 from three: 100%, on one attempt.
  const ps = [player(1, 1, { fg3_pct: 100 }), player(2, 40, { fg3_pct: 41 }), player(3, 60, { fg3_pct: 38 })];

  it('leaves small samples out of leaderboards and team leaders', () => {
    expect(leaders(ps, 'fg3_pct', 3).map((p) => p.id)).toEqual([2, 3]);
    expect(teamLeader(ps, 'fg3_pct')!.id).toBe(2);
  });

  it('leaves small samples off charts and says why', () => {
    const pts = buildPoints(ps, 'fg3a', 'fg3_pct', null, RULES);
    expect(pts.map((p) => p.id)).toEqual([2, 3]);
    expect(leftOut(ps, ['fg3a', 'fg3_pct'], RULES)).toEqual({ noValue: 0, smallSample: 1 });
    // Counting stats are unaffected.
    expect(buildPoints(ps, 'pts', 'reb', null, RULES)).toHaveLength(3);
  });

  it('shows but does not score a small-sample percentage in head to head', () => {
    const rows = versusRows(ps[0], ps[1], RULES);
    const three = rows.find((r) => r.stat === 'fg3_pct')!;
    expect(three).toMatchObject({ a: 100, b: 41, winner: null, smallSample: true });
    expect(rows.find((r) => r.stat === 'fg_pct')!.smallSample).toBe(false);
  });
});
