/**
 * Question-first scatter charts. Each preset pairs two stats an analyst
 * would actually put together, names the four quadrants the league's median
 * lines create, and says what the chart can't show.
 */
import type { StatId } from '@/stats/catalog';

/** Quadrant names, read with "up" meaning higher on the chart. */
export type Quadrants = { topRight: string; topLeft: string; bottomLeft: string; bottomRight: string };

export type Preset = {
  id: string;
  /** Short chip label. */
  label: string;
  /** The chart title: the question it answers. */
  question: string;
  x: StatId;
  y: StatId;
  /** Draw the Y axis upside down so "up" is better (for lower-is-better stats). */
  invertY?: boolean;
  quadrants: Quadrants;
  /** One sentence on reading it, or its limits. */
  note: string;
};

export const PRESETS: readonly Preset[] = [
  {
    id: 'efficiency',
    label: 'Efficiency vs. volume',
    question: 'Who scores efficiently on high volume?',
    x: 'usg_pct',
    y: 'ts_pct',
    quadrants: {
      topRight: 'Efficient stars',
      topLeft: 'Efficient finishers',
      bottomLeft: 'Role players',
      bottomRight: 'Volume scorers',
    },
    note: 'Usage is the share of team plays a player finishes with a shot, free throws or a turnover; true shooting counts threes and free throws in scoring efficiency. Doing both at once is rare.',
  },
  {
    id: 'playmaking',
    label: 'Playmaking',
    question: 'Who creates for teammates without giving the ball away?',
    x: 'ast_pct',
    y: 'tov_pct',
    invertY: true,
    quadrants: {
      topRight: 'Careful creators',
      topLeft: 'Safe hands',
      bottomLeft: 'Loose with it',
      bottomRight: 'High-risk creators',
    },
    note: 'Assist percentage is the share of teammates’ baskets he assisted while on the court. The turnover axis is flipped, so higher on the chart means fewer turnovers.',
  },
  {
    id: 'diet',
    label: 'Shot diet',
    question: 'How does he get his points?',
    x: 'fg3a_rate',
    y: 'fta_rate',
    quadrants: {
      topRight: 'Threes and free throws',
      topLeft: 'Attacks the rim',
      bottomLeft: 'Mid-range heavy',
      bottomRight: 'Three-point specialists',
    },
    note: 'A style chart, not a ranking: neither corner is better. Threes and free throws are the most efficient shots in basketball, so the top-right is where many modern offenses live.',
  },
  {
    id: 'boards',
    label: 'Rebounding',
    question: 'Who cleans the glass at both ends?',
    x: 'oreb_pct',
    y: 'dreb_pct',
    quadrants: {
      topRight: 'Glass cleaners',
      topLeft: 'Defensive boarders',
      bottomLeft: 'Perimeter players',
      bottomRight: 'Offensive crashers',
    },
    note: 'Each axis is the share of available rebounds he grabbed while on the court, so it accounts for minutes and for how many shots were missed.',
  },
  {
    id: 'defense',
    label: 'Defensive events',
    question: 'Who creates steals and blocks?',
    x: 'stl_pct',
    y: 'blk_pct',
    quadrants: {
      topRight: 'Two-way disruptors',
      topLeft: 'Rim protectors',
      bottomLeft: 'Few events',
      bottomRight: 'Ball hawks',
    },
    note: 'Steals and blocks are the parts of defense a box score can see. Positioning, contests and help defense don’t show up here.',
  },
];

export const CUSTOM_ID = 'custom';

export function presetById(id: string | undefined): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
