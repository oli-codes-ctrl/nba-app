import type { Player } from '@/data/types';
import { EMPTY_SCORE } from '@/game/compare';
import { EMPTY_STATS } from '@/game/daily';
import { EMPTY_MYSTERY_STATS, finishQuiz, makeQuiz, mysteryPool, mysteryShareText, QUIZ_LENGTH } from '@/game/mystery';
import { EMPTY_STREAK_STATS } from '@/game/streak';
import { EMPTY_CAREER, newlyUnlocked, progress, recordUnlocks, TROPHIES, type Facts } from '@/game/trophies';
import { clearTally, edgeZ, tally, versusRows, VERSUS_STATS } from '@/players/versus';
import { STAT_IDS, type StatId } from '@/stats/catalog';
import { roster, teamLeader, teamsByConference } from '@/teams/team';

function player(id: number, stats: Partial<Record<StatId, number | null>> = {}, extra: Partial<Player> = {}): Player {
  const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, 10])) as Record<StatId, number | null>;
  Object.assign(s, { mpg: 30 }, stats);
  // Like published data: qualified players carry a percentile for each stat they have.
  const q = extra.q ?? true;
  const pct = q ? (Object.fromEntries(STAT_IDS.filter((sid) => s[sid] != null).map((sid) => [sid, 50])) as Record<StatId, number>) : undefined;
  return { id, name: `P${id}`, searchName: `p${id}`, team: 'BOS', teams: ['BOS'], conf: 'East', pos: 'G', q: true, s, pct, ...extra };
}

describe('Box Score Mystery', () => {
  const season = Array.from({ length: 40 }, (_, i) => player(i + 1, { pts: 5 + i }));

  it('uses season lines until enough box lines exist', () => {
    expect(mysteryPool(season).kind).toBe('season');
    const withGames = season.map((p) => ({ ...p, g: { mpg: 30, pts: p.id } }));
    expect(mysteryPool(withGames).kind).toBe('game');
  });

  it('deals ten distinct answers, each with four distinct names including the answer', () => {
    const quiz = makeQuiz(season)!;
    expect(quiz.questions).toHaveLength(QUIZ_LENGTH);
    expect(new Set(quiz.questions.map((q) => q.answer.id)).size).toBe(QUIZ_LENGTH);
    for (const q of quiz.questions) {
      const ids = q.options.map((o) => o.id);
      expect(ids).toHaveLength(4);
      expect(new Set(ids).size).toBe(4);
      expect(ids).toContain(q.answer.id);
      // Decoys come from the eight closest scorers.
      for (const o of q.options) expect(Math.abs((o.s.pts ?? 0) - (q.answer.s.pts ?? 0))).toBeLessThanOrEqual(8);
    }
  });

  it('needs at least five players', () => {
    expect(makeQuiz(season.slice(0, 4))).toBeNull();
  });

  it('tracks best, played and perfect, and shares marks', () => {
    const s = finishQuiz(finishQuiz(EMPTY_MYSTERY_STATS, 7, 10), 10, 10);
    expect(s).toEqual({ best: 10, played: 2, perfect: 1 });
    expect(mysteryShareText([true, false, true])).toBe('Hoops Box Score Mystery 2/3 🟩🟥🟩');
  });
});

describe('Head to head', () => {
  it('picks a winner per stat, with fewer turnovers winning', () => {
    const a = player(1, { pts: 30, tov: 4, reb: 8 });
    const b = player(2, { pts: 25, tov: 2, reb: 8 });
    const rows = versusRows(a, b);
    expect(rows).toHaveLength(VERSUS_STATS.length);
    const by = Object.fromEntries(rows.map((r) => [r.stat, r.winner]));
    expect(by.pts).toBe('a');
    expect(by.tov).toBe('b');
    expect(by.reb).toBe('tie');
    expect(tally(rows)).toEqual({ a: 1, b: 1 });
  });

  it('leaves missing values without a winner', () => {
    const rows = versusRows(player(1, { fg3_pct: null }), player(2));
    expect(rows.find((r) => r.stat === 'fg3_pct')!.winner).toBeNull();
  });

  it('calls an edge clear only when the ranges separate in the winner’s favor', () => {
    // Clear: 30 (26-34) against 20 (17-23) points.
    // Close: 9 (6-12) against 7 (5-9) assists.
    // Fewer turnovers win: a's 2 (1-3) against b's 5 (4-6) is a clear edge for a.
    const a = player(1, { pts: 30, ast: 9, tov: 2 }, { ci: { pts: [26, 34], ast: [6, 12], tov: [1, 3] } });
    const b = player(2, { pts: 20, ast: 7, tov: 5 }, { ci: { pts: [17, 23], ast: [5, 9], tov: [4, 6] } });
    const rows = versusRows(a, b);
    const by = Object.fromEntries(rows.map((r) => [r.stat, r]));
    expect(by.pts.clear).toBe(true);
    expect(by.ast.clear).toBe(false);
    expect(by.tov.winner).toBe('a');
    expect(by.tov.clear).toBe(true);
    expect(by.game_score.clear).toBeNull(); // no range published
    expect(clearTally(rows)).toEqual({ a: 2, b: 0, close: 1 });
    expect(edgeZ([26, 34], [17, 23])).toBeGreaterThan(1.96);
  });

  it('never calls a clear edge against the long-run estimates', () => {
    // a shoots better so far, but the sample-adjusted ranges favor b.
    const a = player(1, { ft_pct: 98 }, { ci: { ft_pct: [83, 95] } });
    const b = player(2, { ft_pct: 92 }, { ci: { ft_pct: [90, 94] } });
    const row = versusRows(a, b).find((r) => r.stat === 'ft_pct')!;
    expect(row.winner).toBe('a');
    expect(row.clear).toBe(false);
  });
});

describe('Teams', () => {
  const ps = [
    player(1, { mpg: 20, pts: 30 }, { team: 'DEN', conf: 'West' }),
    player(2, { mpg: 35, pts: 20 }, { team: 'DEN', conf: 'West' }),
    player(3, { mpg: 38, pts: 40 }, { team: 'DEN', conf: 'West', q: false }),
    player(4, {}, { team: 'BOS', conf: 'East' }),
  ];

  it('lists the roster by minutes and leaders among qualified players', () => {
    const den = roster(ps, 'DEN');
    expect(den.map((p) => p.id)).toEqual([3, 2, 1]);
    expect(teamLeader(den, 'pts')!.id).toBe(1);
  });

  it('groups teams by conference', () => {
    const groups = teamsByConference(ps);
    expect(groups).toEqual([
      { conf: 'East', teams: ['BOS'] },
      { conf: 'West', teams: ['DEN'] },
    ]);
  });
});

describe('Trophies', () => {
  const facts = (over: Partial<Facts> = {}): Facts => ({
    daily: EMPTY_STATS,
    streak: EMPTY_STREAK_STATS,
    compare: EMPTY_SCORE,
    mystery: EMPTY_MYSTERY_STATS,
    career: EMPTY_CAREER,
    follows: 0,
    ...over,
  });

  it('has unique ids', () => {
    expect(new Set(TROPHIES.map((t) => t.id)).size).toBe(TROPHIES.length);
  });

  it('starts with nothing earned', () => {
    expect(newlyUnlocked(facts())).toEqual([]);
  });

  it('unlocks on reaching the target, once', () => {
    const f = facts({ streak: { best: 10, runs: 3, lastRun: 10 }, follows: 5 });
    const ids = newlyUnlocked(f).map((t) => t.id);
    expect(ids).toEqual(['hl-5', 'hl-10', 'follow-5']);
    const career = recordUnlocks(f.career, newlyUnlocked(f), '2026-11-03');
    expect(career.unlocked['hl-10']).toBe('2026-11-03');
    expect(newlyUnlocked({ ...f, career })).toEqual([]);
  });

  it('never takes a trophy back after a reset', () => {
    const career = { ...EMPTY_CAREER, unlocked: { 'cmp-25': '2026-11-01' } };
    expect(newlyUnlocked(facts({ career, compare: EMPTY_SCORE }))).toEqual([]);
  });

  it('reports progress as a capped fraction', () => {
    const t = TROPHIES.find((x) => x.id === 'daily-streak7')!;
    expect(progress(t, facts({ daily: { ...EMPTY_STATS, bestStreak: 3 } }))).toBeCloseTo(3 / 7);
    expect(progress(t, facts({ daily: { ...EMPTY_STATS, bestStreak: 12 } }))).toBe(1);
  });
});
