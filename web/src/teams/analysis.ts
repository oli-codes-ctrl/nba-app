/**
 * "Is my team for real?" Pure helpers for the team charts: where a team
 * sits on offense and defense, whether its record runs ahead of its point
 * differential by more than luck, and its four factors against the league.
 * Noise half-widths come from the pipeline (formulas.py).
 */
import type { TeamSeason, TeamStatId } from '@/data/types';

export type TeamQuadrant = 'both' | 'defense' | 'offense' | 'neither';

/** Quadrant names, by where a team sits against the league average. */
export const TEAM_QUADRANTS: Record<TeamQuadrant, string> = {
  both: 'Good on both ends',
  defense: 'Defense first',
  offense: 'Offense first',
  neither: 'Behind on both',
};

/** Fewer points allowed is the better defense. Ties go to the better side. */
export function teamQuadrant(ortg: number, drtg: number, league: number): TeamQuadrant {
  const off = ortg >= league;
  const def = drtg <= league;
  return off && def ? 'both' : def ? 'defense' : off ? 'offense' : 'neither';
}

export type Verdict = 'above' | 'below' | 'unclear';

/** Net rating against an average team (0), allowing for game-to-game luck. */
export function netVerdict(t: Pick<TeamSeason, 'net' | 'net_noise'>): Verdict | null {
  if (t.net == null || t.net_noise == null) return null;
  if (t.net - t.net_noise > 0) return 'above';
  if (t.net + t.net_noise < 0) return 'below';
  return 'unclear';
}

/** Has the record run ahead of (above) or behind (below) the point differential by more than luck? */
export function luckVerdict(t: Pick<TeamSeason, 'luck' | 'luck_noise'>): Verdict | null {
  if (t.luck == null || t.luck_noise == null) return null;
  if (t.luck > t.luck_noise) return 'above';
  if (t.luck < -t.luck_noise) return 'below';
  return 'unclear';
}

export type Factor = {
  id: TeamStatId;
  label: string;
  /** Oliver's rough share of what decides games. */
  weight: string;
  /** Fewer is better (turnovers, opponents' shooting and free throws). */
  lowerIsBetter: boolean;
  /** Percentages carry a % sign; free throw rate is made free throws per 100 shots. */
  unit: 'percent' | 'per100';
};

/** Dean Oliver's four factors, on offense and on defense. */
export const FOUR_FACTORS: { side: 'Offense' | 'Defense'; factors: Factor[] }[] = [
  {
    side: 'Offense',
    factors: [
      { id: 'efg_pct', label: 'Shooting (eFG%)', weight: '40%', lowerIsBetter: false, unit: 'percent' },
      { id: 'tov_pct', label: 'Turnovers (TOV%)', weight: '25%', lowerIsBetter: true, unit: 'percent' },
      { id: 'oreb_pct', label: 'Offensive boards (OREB%)', weight: '20%', lowerIsBetter: false, unit: 'percent' },
      { id: 'ft_rate', label: 'Free throws per 100 shots', weight: '15%', lowerIsBetter: false, unit: 'per100' },
    ],
  },
  {
    side: 'Defense',
    factors: [
      { id: 'opp_efg_pct', label: 'Opponents’ shooting (eFG%)', weight: '40%', lowerIsBetter: true, unit: 'percent' },
      { id: 'opp_tov_pct', label: 'Turnovers forced (TOV%)', weight: '25%', lowerIsBetter: false, unit: 'percent' },
      { id: 'dreb_pct', label: 'Defensive boards (DREB%)', weight: '20%', lowerIsBetter: false, unit: 'percent' },
      { id: 'opp_ft_rate', label: 'Opponents’ free throws per 100 shots', weight: '15%', lowerIsBetter: true, unit: 'per100' },
    ],
  },
];

export type FactorRow = Factor & {
  value: number;
  league: number;
  /** League rank, 1 = best. */
  rank: number | null;
  /**
   * Distance from the league average in team standard deviations, signed
   * so positive is better. Capped at +/-2.5 for drawing.
   */
  z: number;
};

const Z_CAP = 2.5;

/**
 * League average of a team stat. Every team's defense is another team's
 * offense, so league-wide the defensive factors mirror the offensive ones
 * (opponents shoot what the league shoots; defensive rebounds are the
 * misses offenses did not get back).
 */
export function leagueValue(id: TeamStatId, league: Partial<Record<TeamStatId, number | null>>): number | null {
  const mirror = (key: TeamStatId, f: (v: number) => number = (v) => v) => {
    const v = league[key];
    return v == null ? null : f(v);
  };
  switch (id) {
    case 'opp_efg_pct':
      return mirror('efg_pct');
    case 'opp_tov_pct':
      return mirror('tov_pct');
    case 'dreb_pct':
      return mirror('oreb_pct', (v) => 100 - v);
    case 'opp_ft_rate':
      return mirror('ft_rate');
    case 'drtg':
      return mirror('ortg');
    default:
      return league[id] ?? null;
  }
}

function sd(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1));
}

/** One team's four factors against the league average and the spread of all teams. */
export function factorRows(
  team: TeamSeason,
  teams: readonly TeamSeason[],
  league: Partial<Record<TeamStatId, number | null>>,
): { side: 'Offense' | 'Defense'; rows: FactorRow[] }[] {
  return FOUR_FACTORS.map(({ side, factors }) => ({
    side,
    rows: factors.flatMap((f): FactorRow[] => {
      const value = team[f.id];
      const values = teams.map((t) => t[f.id]).filter((v): v is number => v != null);
      const avg = leagueValue(f.id, league);
      const spread = sd(values);
      if (value == null || avg == null) return [];
      const raw = spread > 0 ? (value - avg) / spread : 0;
      const z = Math.max(-Z_CAP, Math.min(Z_CAP, f.lowerIsBetter ? -raw : raw));
      return [{ ...f, value, league: avg, rank: team.rank[f.id] ?? null, z }];
    }),
  }));
}

/** Net-rating lines (ORtg - DRtg = c) that cross a square plot, every 5 points. */
export function netLines(xDomain: readonly [number, number], yDomain: readonly [number, number], step = 5): number[] {
  const lo = Math.ceil((xDomain[0] - yDomain[1]) / step) * step;
  const hi = Math.floor((xDomain[1] - yDomain[0]) / step) * step;
  const out: number[] = [];
  for (let c = lo; c <= hi; c += step) out.push(c);
  return out;
}

/** Equal-scale domains (so net-rating lines run at 45 degrees), padded, around the data. */
export function squareDomains(
  xs: readonly number[],
  ys: readonly number[],
  pad = 1.5,
): { x: [number, number]; y: [number, number] } {
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const half = Math.max(x1 - x0, y1 - y0) / 2 + pad;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { x: [cx - half, cx + half], y: [cy - half, cy + half] };
}
