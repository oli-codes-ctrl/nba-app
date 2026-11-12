import type { Player } from '@/data/types';
import {
  addRound,
  COMPARE_STATS,
  comparePool,
  EMPTY_SCORE,
  grade,
  isComplete,
  newRound,
  roundPoints,
  seededRandom,
  type Answers,
  type Round,
} from '@/game/compare';
import { STAT_IDS, type StatId } from '@/stats/catalog';

function player(id: number, q: boolean, stats: Partial<Record<StatId, number | null>>): Player {
  const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, 1])) as Record<StatId, number | null>;
  Object.assign(s, stats);
  return { id, name: `P${id}`, searchName: `p${id}`, team: 'BOS', teams: ['BOS'], conf: 'East', pos: 'G', q, s };
}

/** Deterministic random source that replays the given values. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('comparePool', () => {
  it('keeps qualified players at 30+ minutes', () => {
    const pool = comparePool([
      player(1, true, { mpg: 34 }),
      player(2, true, { mpg: 30 }),
      player(3, true, { mpg: 29.9 }),
      player(4, false, { mpg: 38 }),
    ]);
    expect(pool.map((p) => p.id)).toEqual([1, 2]);
  });

  it('falls back to the most minutes when too few reach 30', () => {
    const pool = comparePool([player(1, true, { mpg: 31 }), player(2, true, { mpg: 25 }), player(3, true, { mpg: 28 })]);
    expect(pool.map((p) => p.id)).toEqual([1, 3, 2]);
  });

  it('skips players missing a compared stat', () => {
    const pool = comparePool([player(1, true, { mpg: 34 }), player(2, true, { mpg: 34, blk: null }), player(3, true, { mpg: 33 })]);
    expect(pool.map((p) => p.id)).toEqual([1, 3]);
  });
});

describe('newRound', () => {
  const pool = [player(1, true, {}), player(2, true, {}), player(3, true, {})];

  it('never pairs a player with themselves', () => {
    for (const r of [0, 0.34, 0.67, 0.99]) {
      const round = newRound(pool, seq(r, r, 0, 0));
      expect(round!.a.id).not.toBe(round!.b.id);
    }
  });

  it('uses the MATLAB double-points rule: two rolls of 1-100 multiplying past 2000', () => {
    // 0.5 -> 51 and 0.4 -> 41: 2091 > 2000.
    expect(newRound(pool, seq(0, 0, 0.5, 0.4))!.double).toBe(true);
    // 0.5 -> 51 and 0.3 -> 31: 1581.
    expect(newRound(pool, seq(0, 0, 0.5, 0.3))!.double).toBe(false);
  });

  it('deals the same first round for the same seed', () => {
    const r1 = newRound(pool, seededRandom('2026-11-03T10:00:00+00:00'));
    const r2 = newRound(pool, seededRandom('2026-11-03T10:00:00+00:00'));
    expect([r1!.a.id, r1!.b.id, r1!.double]).toEqual([r2!.a.id, r2!.b.id, r2!.double]);
    const rand = seededRandom('x');
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('needs at least two players', () => {
    expect(newRound([pool[0]])).toBeNull();
  });
});

describe('grading', () => {
  const round = (double: boolean): Round => ({
    a: player(1, true, { ast: 8, pts: 20, stl: 1, blk: 1, pf: 3 }),
    b: player(2, true, { ast: 4, pts: 25, stl: 1, blk: 2, pf: 2 }),
    double,
  });
  const answers: Answers = { ast: 'a', pts: 'a', stl: 'b', blk: 'b', pf: 'b' };

  it('needs an answer for every stat', () => {
    expect(isComplete({ ast: 'a' })).toBe(false);
    expect(isComplete(answers)).toBe(true);
  });

  it('marks each pick, counting ties as right', () => {
    const results = grade(round(false), answers);
    expect(results.map((r) => [r.stat, r.correct])).toEqual([
      ['ast', true],
      ['pts', false],
      ['stl', true],
      ['blk', true],
      ['pf', false],
    ]);
    expect(results).toHaveLength(COMPARE_STATS.length);
  });

  it('scores +1 per right and -1 per wrong, doubling only the right ones', () => {
    expect(roundPoints(round(false), grade(round(false), answers))).toBe(1);
    expect(roundPoints(round(true), grade(round(true), answers))).toBe(4);
  });

  it('keeps a running score and best round', () => {
    const total = addRound(addRound(EMPTY_SCORE, 3), -1);
    expect(total).toEqual({ score: 2, rounds: 2, best: 3 });
  });
});
