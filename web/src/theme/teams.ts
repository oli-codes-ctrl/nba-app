/**
 * Team names and colors. No logos: a team is its abbreviation plus a color.
 * Abbreviations match pipeline/hoops_pipeline/teams.py.
 *
 * Colors are each team's published set, primary first, as listed on
 * teamcolorcodes.com (checked 2026-11-16; Utah's list predates its 2025
 * rebrand). The site shows one of them, the display color: the first
 * chromatic color that reaches 3:1 against the panel surface, else the first
 * neutral that does. A navy primary on a dark page is invisible, so Denver
 * shows its gold and Brooklyn its white. Team colors are identity only:
 * never text, never a data encoding.
 */

/** The panel surface team colors sit on (`--surface-1` in styles/tokens.css; a test keeps them equal). */
export const TEAM_SURFACE = '#12161B';

const COLORS: Record<string, { name: string; colors: readonly string[] }> = {
  ATL: { name: 'Atlanta', colors: ['#E03A3E', '#C1D32F', '#26282A'] },
  BOS: { name: 'Boston', colors: ['#007A33', '#BA9653', '#963821', '#FFFFFF', '#000000'] },
  BKN: { name: 'Brooklyn', colors: ['#000000', '#FFFFFF'] },
  CHA: { name: 'Charlotte', colors: ['#1D1160', '#00788C', '#A1A1A4'] },
  CHI: { name: 'Chicago', colors: ['#CE1141', '#000000'] },
  CLE: { name: 'Cleveland', colors: ['#860038', '#041E42', '#FDBB30', '#000000'] },
  DAL: { name: 'Dallas', colors: ['#00538C', '#002B5E', '#B8C4CA', '#000000'] },
  DEN: { name: 'Denver', colors: ['#0E2240', '#FEC524', '#8B2131', '#1D428A'] },
  DET: { name: 'Detroit', colors: ['#C8102E', '#1D42BA', '#BEC0C2', '#002D62'] },
  GSW: { name: 'Golden State', colors: ['#1D428A', '#FFC72C'] },
  HOU: { name: 'Houston', colors: ['#CE1141', '#000000', '#C4CED4'] },
  IND: { name: 'Indiana', colors: ['#002D62', '#FDBB30', '#BEC0C2'] },
  LAC: { name: 'LA Clippers', colors: ['#C8102E', '#1D428A', '#BEC0C2', '#000000'] },
  LAL: { name: 'LA Lakers', colors: ['#552583', '#FDB927', '#000000'] },
  MEM: { name: 'Memphis', colors: ['#5D76A9', '#12173F', '#F5B112', '#707271'] },
  MIA: { name: 'Miami', colors: ['#98002E', '#F9A01B', '#000000'] },
  MIL: { name: 'Milwaukee', colors: ['#00471B', '#EEE1C6', '#0077C0', '#000000'] },
  MIN: { name: 'Minnesota', colors: ['#0C2340', '#236192', '#9EA2A2', '#78BE20'] },
  NOP: { name: 'New Orleans', colors: ['#0C2340', '#C8102E', '#85714D'] },
  NYK: { name: 'New York', colors: ['#006BB6', '#F58426', '#BEC0C2', '#000000'] },
  OKC: { name: 'Oklahoma City', colors: ['#007AC1', '#EF3B24', '#002D62', '#FDBB30'] },
  ORL: { name: 'Orlando', colors: ['#0077C0', '#C4CED4', '#000000'] },
  PHI: { name: 'Philadelphia', colors: ['#006BB6', '#ED174C', '#002B5C', '#C4CED4'] },
  PHX: { name: 'Phoenix', colors: ['#1D1160', '#E56020', '#000000', '#63727A', '#F9AD1B'] },
  POR: { name: 'Portland', colors: ['#E03A3E', '#000000'] },
  SAC: { name: 'Sacramento', colors: ['#5A2D81', '#63727A', '#000000'] },
  SAS: { name: 'San Antonio', colors: ['#C4CED4', '#000000'] },
  TOR: { name: 'Toronto', colors: ['#CE1141', '#000000', '#A1A1A4', '#B4975A'] },
  UTA: { name: 'Utah', colors: ['#002B5C', '#00471B', '#F9A01B'] },
  WAS: { name: 'Washington', colors: ['#002B5C', '#E31837', '#C4CED4'] },
};

/** Relative luminance (WCAG) of a #RRGGBB color. */
export function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two #RRGGBB colors. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A color rather than a grey, white or black: its channels spread apart. */
function isChromatic(hex: string): boolean {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(...c) - Math.min(...c) > 40;
}

/** The color a team shows on the site's panels (see the file comment). */
export function displayColor(colors: readonly string[]): string {
  const visible = colors.filter((c) => contrastRatio(c, TEAM_SURFACE) >= 3);
  return visible.find(isChromatic) ?? visible[0] ?? FALLBACK.color;
}

export type TeamInfo = {
  name: string;
  /** The published colors, primary first. */
  colors: readonly string[];
  /** The one the site shows. */
  color: string;
};

const FALLBACK = { name: 'Unknown team', colors: ['#8C95A2'], color: '#8C95A2' } as const;

export const TEAMS: Record<string, TeamInfo> = Object.fromEntries(
  Object.entries(COLORS).map(([abbr, t]) => [abbr, { ...t, color: displayColor(t.colors) }]),
);

export function teamInfo(abbr: string): TeamInfo {
  return TEAMS[abbr] ?? FALLBACK;
}
