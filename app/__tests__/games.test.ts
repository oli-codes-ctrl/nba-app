import type { GamesDoc, Player } from '@/data/types';
import { bestGames, heat, heatCheck, HEAT_Z, playerLog, recentWindow, trailing } from '@/games/logs';
import { pressPoint } from '@/graphs/math';
import { STAT_IDS, type StatId } from '@/stats/catalog';

function player(id: number, extra: Partial<Player> = {}): Player {
  const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, 10])) as Record<StatId, number | null>;
  return { id, name: `P${id}`, searchName: `p${id}`, team: 'LAL', teams: ['LAL'], conf: 'West', pos: 'G', q: true, s, ...extra };
}

/** A season of `n` games for player 1 (home) and player 2 (away), with given Game Scores. */
function doc(scores1: number[], scores2: number[]): GamesDoc {
  const games = scores1.map((_, i): GamesDoc['games'][number] => [
    `g${i}`,
    `2026-10-${String(21 + i).padStart(2, '0')}`,
    'LAL',
    'MIA',
    110 + i,
    100,
  ]);
  return {
    schemaVersion: 2,
    season: 2026,
    gamesThrough: games[games.length - 1][1],
    boxScoresThrough: games[games.length - 1][1],
    keys: ['min', 'pts', 'gmsc'],
    games,
    players: {
      '1': scores1.map((g, i) => [i, 0, 1, 30, Math.round(g * 1.5), g]),
      '2': scores2.map((g, i) => [i, 1, 0, 25, Math.round(g * 1.5), g]),
    },
  };
}

describe('game logs', () => {
  it('reads a player’s games from either side of the box score', () => {
    const d = doc([10, 20], [5, 6]);
    const away = playerLog(d, 2);
    expect(away).toHaveLength(2);
    expect(away[0]).toMatchObject({ team: 'MIA', opp: 'LAL', home: false, starter: false, won: false, teamPts: 100, oppPts: 110 });
    expect(away[1].v).toEqual({ min: 25, pts: 9, gmsc: 6 });
    expect(playerLog(d, 99)).toEqual([]);
  });

  it('averages the trailing window with a band from his season-long spread', () => {
    const t = trailing([10, 20, 30], 2);
    expect(t.map((p) => p.mean)).toEqual([10, 15, 25]);
    // Spread of 10, 20, 30 is 10: half-widths 1.96 * 10 / sqrt(n).
    expect(t[0].hi! - t[0].mean).toBeCloseTo(19.6);
    expect(t[2].hi! - t[2].mean).toBeCloseTo(19.6 / Math.SQRT2);
    expect(trailing([7])[0].lo).toBeNull();
  });

  it('flags only changes bigger than game-to-game luck', () => {
    const jump = heat([10, 12, 9, 11, 10, 30, 31, 29], 3)!;
    expect(jump.recent).toBe(30);
    expect(jump.z).toBeGreaterThan(HEAT_Z);
    const steady = heat([10, 14, 8, 12, 9, 13, 11, 10], 3)!;
    expect(Math.abs(steady.z)).toBeLessThan(HEAT_Z);
    expect(heat([10, 12, 30], 3)).toBeNull(); // not enough earlier games
  });

  it('uses five recent games once most players have ten', () => {
    expect(recentWindow([6, 7, 8])).toBe(3);
    expect(recentWindow([10, 12, 14])).toBe(5);
  });

  it('lists hot and cold players among qualified ones only', () => {
    const d = doc([10, 12, 9, 11, 10, 30, 31, 29], [20, 22, 19, 21, 20, 5, 4, 6]);
    const ps = [player(1), player(2)];
    const { hot, cold, recentGames, checked } = heatCheck(d, ps);
    expect(recentGames).toBe(3);
    expect(checked).toBe(2);
    expect(hot.map((r) => r.player.id)).toEqual([1]);
    expect(cold.map((r) => r.player.id)).toEqual([2]);
    expect(heatCheck(d, [player(1, { q: false })]).checked).toBe(0);
  });

  it('ranks the best single games, on one date or all season', () => {
    const d = doc([10, 40, 12], [35, 6, 7]);
    const byId = new Map([1, 2].map((id) => [id, player(id)]));
    const season = bestGames(d, byId, 2);
    expect(season.map((b) => [b.player.id, b.game.v.gmsc])).toEqual([
      [1, 40],
      [2, 35],
    ]);
    const lastDay = bestGames(d, byId, 5, { date: d.games[2][1] });
    expect(lastDay.map((b) => b.game.v.gmsc)).toEqual([12, 7]);
  });
});

describe('press position', () => {
  it('reads native locations, and the DOM offsets on the web', () => {
    expect(pressPoint({ nativeEvent: { locationX: 10, locationY: 20, offsetX: 99, offsetY: 99 } })).toEqual({ x: 10, y: 20 });
    expect(pressPoint({ nativeEvent: { offsetX: 167, offsetY: 40 } })).toEqual({ x: 167, y: 40 });
    expect(pressPoint({ nativeEvent: {} }).x).toBeNaN();
  });
});
