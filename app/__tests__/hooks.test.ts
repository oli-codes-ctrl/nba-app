import type { Player } from '@/data/types';
import { EMPTY_STATS, liveStreak, type DailyStats } from '@/game/daily';
import { endRun, EMPTY_STREAK_STATS, isRight, level, nextRound, streakPool, STREAK_STATS } from '@/game/streak';
import { hourLabel, planReminders } from '@/notify/plan';
import { STAT_IDS, type StatId } from '@/stats/catalog';
import { boxLine, factOfTheDay, formChanges, leaders, topGames } from '@/today/feed';

function player(id: number, stats: Partial<Record<StatId, number | null>> = {}, extra: Partial<Player> = {}): Player {
  const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, 10])) as Record<StatId, number | null>;
  Object.assign(s, { mpg: 30 }, stats);
  // Like published data: qualified players carry a percentile for each stat they have.
  const q = extra.q ?? true;
  const pct = q ? (Object.fromEntries(STAT_IDS.filter((sid) => s[sid] != null).map((sid) => [sid, 50])) as Record<StatId, number>) : undefined;
  return {
    id,
    name: `P${id}`,
    searchName: `p${id}`,
    team: 'BOS',
    teams: ['BOS'],
    conf: 'East',
    pos: 'G',
    q: true,
    s,
    pct,
    ...extra,
  };
}

/** Deterministic random source cycling through the given values. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('Higher or Lower', () => {
  it('pools qualified players with real minutes, most minutes first', () => {
    const pool = streakPool([
      player(1, { mpg: 25 }),
      player(2, { mpg: 36 }),
      player(3, { mpg: 15 }),
      player(4, { mpg: 38 }, { q: false }),
    ]);
    expect(pool.map((p) => p.id)).toEqual([2, 1]);
  });

  it('gets harder every four in a row', () => {
    expect([0, 3, 4, 8, 12, 40].map(level)).toEqual([0, 0, 1, 2, 3, 3]);
  });

  it('chains: the mystery player becomes the known one and the stat changes', () => {
    const pool = Array.from({ length: 30 }, (_, i) =>
      player(i + 1, Object.fromEntries(STREAK_STATS.map((s) => [s, 1 + i * 0.7]))),
    );
    let round = nextRound(pool, 0, null, seq(0.1, 0.9, 0.5, 0.3, 0.7))!;
    for (let streak = 1; streak < 20; streak++) {
      const next = nextRound(pool, streak, round, Math.random)!;
      expect(next.known.id).toBe(round.mystery.id);
      expect(next.stat).not.toBe(round.stat);
      expect(next.mystery.id).not.toBe(next.known.id);
      round = next;
    }
  });

  it('never deals values that look equal on screen', () => {
    const pool = [player(1, { pts: 20.01 }), player(2, { pts: 20.04 }), player(3, { pts: 30 })];
    for (let i = 0; i < 50; i++) {
      const r = nextRound(pool, 0, null, Math.random);
      if (r && r.stat === 'pts') {
        expect([r.known.id, r.mystery.id].sort()).not.toEqual([1, 2]);
      }
    }
  });

  it('grades higher and lower', () => {
    const round = { stat: 'pts' as StatId, known: player(1, { pts: 20 }), mystery: player(2, { pts: 25 }) };
    expect(isRight(round, 'higher')).toBe(true);
    expect(isRight(round, 'lower')).toBe(false);
  });

  it('keeps the best run', () => {
    const s = endRun(endRun(EMPTY_STREAK_STATS, 7), 3);
    expect(s).toEqual({ best: 7, runs: 2, lastRun: 3 });
  });

  it('needs two players', () => {
    expect(nextRound([player(1)], 0)).toBeNull();
  });
});

describe('Today feed', () => {
  it('ranks latest games by Game Score and formats a box line', () => {
    const ps = [
      player(1, {}, { g: { pts: 20, reb: 5, ast: 5, game_score: 15 } }),
      player(2, {}, { g: { pts: 41, reb: 9, ast: 7, stl: 3, fg3m: 6, game_score: 33.2 } }),
      player(3),
    ];
    expect(topGames(ps).map((p) => p.id)).toEqual([2, 1]);
    expect(boxLine(ps[1].g!)).toBe('41 PTS · 9 REB · 7 AST · 3 STL · 6 3PM');
  });

  it('finds who is heating up and cooling off, with at least two recent games', () => {
    const ps = [
      player(1, { pts: 20 }, { r: { gp: 3, pts: 28 } }),
      player(2, { pts: 20 }, { r: { gp: 3, pts: 14 } }),
      player(3, { pts: 20 }, { r: { gp: 1, pts: 40 } }),
      player(4, { pts: 3 }, { r: { gp: 3, pts: 6 } }),
      player(5, { pts: 20 }, { q: false, r: { gp: 3, pts: 35 } }),
    ];
    const { hot, cold } = formChanges(ps);
    expect(hot.map((r) => [r.player.id, r.change])).toEqual([[1, 8]]);
    expect(cold.map((r) => [r.player.id, r.change])).toEqual([[2, -6]]);
  });

  it('leaders count fewest as best for turnovers', () => {
    const ps = [player(1, { tov: 3 }), player(2, { tov: 1 }), player(3, { tov: 2 }, { q: false })];
    expect(leaders(ps, 'tov', 2).map((p) => p.id)).toEqual([2, 1]);
    expect(leaders(ps, 'pts', 1)).toHaveLength(1);
  });

  it('gives one stable fact per day and links its players', () => {
    const ps = Array.from({ length: 40 }, (_, i) =>
      player(i + 1, { pts: 5 + i, reb: 3 + (i % 9), ast: 2 + (i % 8), age: 19 + (i % 15), fg3a: 6, fg3_pct: 30 + (i % 12) }, { pos: i % 5 === 0 ? 'C' : 'G' }),
    );
    const a = factOfTheDay(ps, '2026-11-03');
    expect(a).toEqual(factOfTheDay(ps, '2026-11-03'));
    expect(a!.text.length).toBeGreaterThan(20);
    for (const id of a!.playerIds) expect(ps.some((p) => p.id === id)).toBe(true);
    const texts = new Set(Array.from({ length: 30 }, (_, d) => factOfTheDay(ps, `2026-11-${String(d + 1).padStart(2, '0')}`)!.text));
    expect(texts.size).toBeGreaterThan(2);
  });
});

describe('daily reminders', () => {
  const stats = (s: Partial<DailyStats>): DailyStats => ({ ...EMPTY_STATS, ...s });
  const morning = new Date(2026, 10, 3, 9, 0);

  it('plans a week of reminders at the chosen hour', () => {
    const plan = planReminders({ now: morning, hour: 18, stats: EMPTY_STATS, playedToday: false });
    expect(plan).toHaveLength(7);
    expect(plan[0].at).toEqual(new Date(2026, 10, 3, 18, 0, 0));
    expect(plan[6].at).toEqual(new Date(2026, 10, 9, 18, 0, 0));
  });

  it('skips today once played or once the hour has passed', () => {
    expect(planReminders({ now: morning, hour: 18, stats: EMPTY_STATS, playedToday: true })[0].at.getDate()).toBe(4);
    const evening = new Date(2026, 10, 3, 19, 0);
    expect(planReminders({ now: evening, hour: 18, stats: EMPTY_STATS, playedToday: false })[0].at.getDate()).toBe(4);
  });

  it('mentions a live streak only on the next unplayed day', () => {
    const alive = stats({ currentStreak: 4, lastDate: '2026-11-02' });
    const plan = planReminders({ now: morning, hour: 18, stats: alive, playedToday: false });
    expect(plan[0].title).toBe('Keep your 4-day streak going');
    expect(plan[1].title).not.toContain('streak');

    const playedToday = stats({ currentStreak: 5, lastDate: '2026-11-03' });
    const next = planReminders({ now: morning, hour: 18, stats: playedToday, playedToday: true });
    expect(next[0].title).toBe('Keep your 5-day streak going');

    const lapsed = stats({ currentStreak: 9, lastDate: '2026-10-30' });
    expect(planReminders({ now: morning, hour: 18, stats: lapsed, playedToday: false })[0].title).not.toContain('streak');
  });

  it('labels hours', () => {
    expect([0, 9, 12, 18, 21].map(hourLabel)).toEqual(['12 AM', '9 AM', '12 PM', '6 PM', '9 PM']);
  });

  it('lets a streak lapse after a missed day', () => {
    const s = stats({ currentStreak: 3, lastDate: '2026-11-01' });
    expect(liveStreak(s, '2026-11-02')).toBe(3);
    expect(liveStreak(s, '2026-11-03')).toBe(0);
  });
});
