import type { TeamSeason } from '@/data/types';
import {
  factorRows,
  leagueValue,
  luckVerdict,
  netLines,
  netVerdict,
  squareDomains,
  teamQuadrant,
} from '@/teams/analysis';

function team(abbr: string, values: Partial<TeamSeason> = {}): TeamSeason {
  return {
    abbr,
    gp: 8,
    w: 4,
    l: 4,
    pf: 900,
    pa: 900,
    poss: 800,
    pyth_w: 4,
    luck: 0,
    luck_noise: 1.7,
    net_noise: 8.3,
    ortg: 114,
    drtg: 114,
    net: 0,
    pace: 100,
    efg_pct: 53,
    tov_pct: 13,
    oreb_pct: 27,
    ft_rate: 22,
    fg3a_rate: 43,
    opp_efg_pct: 53,
    opp_tov_pct: 13,
    dreb_pct: 73,
    opp_ft_rate: 22,
    rank: {},
    ...values,
  };
}

describe('offense against defense', () => {
  it('names quadrants against the league average, with fewer allowed as better', () => {
    expect(teamQuadrant(118, 110, 114)).toBe('both');
    expect(teamQuadrant(110, 110, 114)).toBe('defense');
    expect(teamQuadrant(118, 118, 114)).toBe('offense');
    expect(teamQuadrant(110, 118, 114)).toBe('neither');
    expect(teamQuadrant(114, 114, 114)).toBe('both'); // ties go to the better side
  });

  it('uses one scale on both axes so net-rating lines run at 45 degrees', () => {
    const { x, y } = squareDomains([108, 120], [110, 114]);
    expect(x[1] - x[0]).toBeCloseTo(y[1] - y[0]);
    expect(x[0]).toBeLessThanOrEqual(108);
    expect(y[1]).toBeGreaterThanOrEqual(114);
    // Lines ORtg - DRtg = c that cross a 100-120 by 100-120 square.
    expect(netLines([100, 120], [100, 120], 5)).toEqual([-20, -15, -10, -5, 0, 5, 10, 15, 20]);
  });
});

describe('verdicts allow for luck', () => {
  it('calls a net rating only when its whole range clears zero', () => {
    expect(netVerdict({ net: 9, net_noise: 8.3 })).toBe('above');
    expect(netVerdict({ net: 6, net_noise: 8.3 })).toBe('unclear');
    expect(netVerdict({ net: -9, net_noise: 8.3 })).toBe('below');
    expect(netVerdict({ net: 9, net_noise: undefined })).toBeNull();
  });

  it('calls luck only outside the band luck alone produces', () => {
    expect(luckVerdict({ luck: 2.1, luck_noise: 1.7 })).toBe('above');
    expect(luckVerdict({ luck: -1.2, luck_noise: 1.7 })).toBe('unclear');
    expect(luckVerdict({ luck: -2, luck_noise: 1.7 })).toBe('below');
  });
});

describe('four factors', () => {
  const league = { efg_pct: 53, tov_pct: 13, oreb_pct: 27, ft_rate: 22 };

  it('mirrors the offensive league averages for defense', () => {
    expect(leagueValue('opp_efg_pct', league)).toBe(53);
    expect(leagueValue('dreb_pct', league)).toBe(73);
    expect(leagueValue('opp_ft_rate', league)).toBe(22);
  });

  it('signs every factor so positive is better, capped for drawing', () => {
    const teams = [
      team('A', { efg_pct: 56, tov_pct: 11, opp_efg_pct: 50 }),
      team('B', { efg_pct: 53, tov_pct: 13, opp_efg_pct: 53 }),
      team('C', { efg_pct: 50, tov_pct: 15, opp_efg_pct: 56 }),
    ];
    const [offense, defense] = factorRows(teams[0], teams, league);
    const byId = Object.fromEntries([...offense.rows, ...defense.rows].map((r) => [r.id, r]));
    expect(byId.efg_pct.z).toBeGreaterThan(0); // shoots better than average
    expect(byId.tov_pct.z).toBeGreaterThan(0); // fewer turnovers is better
    expect(byId.opp_efg_pct.z).toBeGreaterThan(0); // holds opponents below average
    expect(byId.efg_pct.z).toBeCloseTo(1); // one team-SD above the league
    const extreme = factorRows(team('X', { efg_pct: 80 }), teams, league)[0].rows[0];
    expect(extreme.z).toBe(2.5);
  });
});
