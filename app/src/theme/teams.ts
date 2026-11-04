/**
 * Team names and primary colors for the abbreviation chips. No logos.
 * Abbreviations match pipeline/hoops_pipeline/teams.py.
 */
import { chipText } from './tokens';

export type TeamInfo = { name: string; color: string };

export const TEAMS: Record<string, TeamInfo> = {
  // Deeper than the brand red so white chip text reaches 4.5:1.
  ATL: { name: 'Atlanta', color: '#C8102E' },
  BOS: { name: 'Boston', color: '#007A33' },
  BKN: { name: 'Brooklyn', color: '#000000' },
  CHA: { name: 'Charlotte', color: '#1D1160' },
  CHI: { name: 'Chicago', color: '#CE1141' },
  CLE: { name: 'Cleveland', color: '#860038' },
  DAL: { name: 'Dallas', color: '#00538C' },
  DEN: { name: 'Denver', color: '#0E2240' },
  DET: { name: 'Detroit', color: '#C8102E' },
  GSW: { name: 'Golden State', color: '#1D428A' },
  HOU: { name: 'Houston', color: '#CE1141' },
  IND: { name: 'Indiana', color: '#002D62' },
  LAC: { name: 'LA Clippers', color: '#C8102E' },
  LAL: { name: 'LA Lakers', color: '#552583' },
  MEM: { name: 'Memphis', color: '#5D76A9' },
  MIA: { name: 'Miami', color: '#98002E' },
  MIL: { name: 'Milwaukee', color: '#00471B' },
  MIN: { name: 'Minnesota', color: '#0C2340' },
  NOP: { name: 'New Orleans', color: '#0C2340' },
  NYK: { name: 'New York', color: '#006BB6' },
  OKC: { name: 'Oklahoma City', color: '#007AC1' },
  ORL: { name: 'Orlando', color: '#0077C0' },
  PHI: { name: 'Philadelphia', color: '#006BB6' },
  PHX: { name: 'Phoenix', color: '#1D1160' },
  POR: { name: 'Portland', color: '#C8102E' },
  SAC: { name: 'Sacramento', color: '#5A2D81' },
  SAS: { name: 'San Antonio', color: '#C4CED4' },
  TOR: { name: 'Toronto', color: '#CE1141' },
  UTA: { name: 'Utah', color: '#002B5C' },
  WAS: { name: 'Washington', color: '#002B5C' },
};

const FALLBACK: TeamInfo = { name: 'Unknown team', color: '#868E96' };

export function teamInfo(abbr: string): TeamInfo {
  return TEAMS[abbr] ?? FALLBACK;
}

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

/** Whichever of white or near-black text reads better on a chip. */
export function chipTextColor(background: string): string {
  return contrastRatio(chipText.onDark, background) >= contrastRatio(chipText.onLight, background)
    ? chipText.onDark
    : chipText.onLight;
}
