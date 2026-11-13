import { packMystery, packStreak, unpackMystery, unpackStreak, GAME_FIELDS } from '@/components/games/gameData';
import type { Player, StatLine } from '@/data/types';
import { makeQuiz, mysteryPool } from '@/game/mystery';
import { nextRound, STREAK_STATS, streakPool } from '@/game/streak';

/** A small deterministic random source, so two deals can be compared. */
function seeded(seed: number): () => number {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

function makePlayers(n: number, withGames: number): Player[] {
  const rand = seeded(7);
  return Array.from({ length: n }, (_, i) => {
    const mpg = Math.round((8 + rand() * 30) * 10) / 10;
    const s = {
      gp: 10 + Math.floor(rand() * 10),
      mpg,
      pts: Math.round(rand() * 300) / 10,
      reb: Math.round(rand() * 120) / 10,
      ast: Math.round(rand() * 100) / 10,
      stl: Math.round(rand() * 25) / 10,
      blk: Math.round(rand() * 25) / 10,
      tov: Math.round(rand() * 40) / 10,
      fg3m: Math.round(rand() * 40) / 10,
      fg_pct: Math.round(400 + rand() * 200) / 10,
      fg3_pct: Math.round(300 + rand() * 150) / 10,
    } as unknown as StatLine;
    const p: Player = {
      id: 1000 + i,
      name: `Player ${i}`,
      searchName: `player ${i}`,
      team: i % 2 ? 'BOS' : 'DEN',
      teams: [i % 2 ? 'BOS' : 'DEN'],
      conf: 'East',
      pos: ['G', 'F', 'C'][i % 3],
      q: i % 7 !== 0,
      s,
    };
    if (i < withGames) {
      p.g = Object.fromEntries(GAME_FIELDS.map((id) => [id, id === 'mpg' ? 20 + (i % 15) : Math.floor(rand() * 30)]));
    }
    return p;
  });
}

describe('game data packing', () => {
  it('rebuilds the Higher or Lower pool the app picks, with the same values', () => {
    const players = makePlayers(220, 0);
    const unpacked = unpackStreak(JSON.parse(JSON.stringify(packStreak(players))));
    const pool = streakPool(players);
    expect(unpacked.map((p) => p.id)).toEqual(pool.map((p) => p.id));
    for (let i = 0; i < pool.length; i++) {
      for (const id of STREAK_STATS) expect(unpacked[i].s[id]).toBe(pool[i].s[id] ?? undefined);
    }
    // The same random source deals the same rounds on either copy.
    const a = nextRound(pool, 5, null, seeded(3));
    const b = nextRound(unpacked, 5, null, seeded(3));
    expect([b?.stat, b?.known.id, b?.mystery.id]).toEqual([a?.stat, a?.known.id, a?.mystery.id]);
  });

  it('rebuilds the Box Score Mystery pool from game lines, and deals the same quiz', () => {
    const players = makePlayers(120, 60);
    const data = packMystery(players);
    expect(data.kind).toBe('game');
    const unpacked = unpackMystery(JSON.parse(JSON.stringify(data)));
    const original = mysteryPool(players);
    const again = mysteryPool(unpacked);
    expect(again.kind).toBe('game');
    expect(again.pool.map((p) => p.id)).toEqual(original.pool.map((p) => p.id));
    for (const p of again.pool) {
      const o = players.find((x) => x.id === p.id)!;
      for (const id of GAME_FIELDS) expect(p.g?.[id]).toBe(o.g?.[id]);
    }
    const qa = makeQuiz(players, seeded(11))!;
    const qb = makeQuiz(unpacked, seeded(11))!;
    expect(qb.questions.map((q) => [q.answer.id, q.options.map((o) => o.id)])).toEqual(
      qa.questions.map((q) => [q.answer.id, q.options.map((o) => o.id)]),
    );
  });

  it('keeps a season-averages pool a season pool when few players have a fresh game', () => {
    const players = makePlayers(120, 5);
    const data = packMystery(players);
    expect(data.kind).toBe('season');
    const unpacked = unpackMystery(data);
    expect(unpacked.every((p) => p.g === undefined)).toBe(true);
    const again = mysteryPool(unpacked);
    expect(again.kind).toBe('season');
    expect(again.pool.map((p) => p.id)).toEqual(mysteryPool(players).pool.map((p) => p.id));
  });
});
