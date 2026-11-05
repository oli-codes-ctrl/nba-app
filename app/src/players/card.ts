/**
 * The player card: "How good is he, really?" A dozen stats fans argue about,
 * each as a percentile plus the range his rank could still move through,
 * and insights that only claim what those ranges support. Pure, tested.
 */
import type { Player } from '@/data/types';
import { rankBand } from '@/graphs/distribution';
import { betterThan } from '@/lib/format';
import { CATALOG, type StatId } from '@/stats/catalog';
import { positionGroup, type PositionGroup } from '@/stats/views';

export type CardSection = { title: string; rows: readonly { stat: StatId; label: string }[] };

export const CARD_SECTIONS: readonly CardSection[] = [
  { title: 'Overall', rows: [{ stat: 'game_score', label: 'Game Score' }] },
  {
    title: 'Scoring',
    rows: [
      { stat: 'pts', label: 'Points' },
      { stat: 'ts_pct', label: 'True shooting\u00A0%' },
      { stat: 'fg3_pct', label: 'Three-point\u00A0%' },
      { stat: 'ft_pct', label: 'Free throw\u00A0%' },
    ],
  },
  {
    title: 'Playmaking',
    rows: [
      { stat: 'ast_pct', label: 'Assist\u00A0%' },
      { stat: 'tov_pct', label: 'Turnover\u00A0%' },
    ],
  },
  {
    title: 'Boards and defense',
    rows: [
      { stat: 'reb_pct', label: 'Rebound\u00A0%' },
      { stat: 'stl_pct', label: 'Steal\u00A0%' },
      { stat: 'blk_pct', label: 'Block\u00A0%' },
    ],
  },
  { title: 'Role', rows: [{ stat: 'usg_pct', label: 'Usage' }] },
];

export const CARD_STATS: readonly StatId[] = CARD_SECTIONS.flatMap((s) => s.rows.map((r) => r.stat));

/** "Elite" needs even the unlucky end of his range above this percentile. */
export const ELITE = 80;
/** "Weak spot" needs even the lucky end of his range below this one. */
export const WEAK = 20;
/** Outside these, a rank that is not yet settled is worth flagging. */
const STANDOUT = 90;

export type CardRow = {
  stat: StatId;
  label: string;
  value: number | null;
  /** "Better than X%" of the pool (0-100, higher is better); null when not ranked. */
  better: number | null;
  /** Where the two ends of his likely range would rank, on the same scale. */
  band: [number, number] | null;
  /** A role, not a quality: shown without color or judgment. */
  neutral: boolean;
};

/** Values of one stat across the ranked pool: everyone, or one position group. */
export function poolValues(players: readonly Player[], stat: StatId, group: PositionGroup | null): number[] {
  const out: number[] = [];
  for (const p of players) {
    const ranked = group ? positionGroup(p.pos) === group && p.pctPos?.[stat] != null : p.pct?.[stat] != null;
    const v = p.s[stat];
    if (ranked && v != null) out.push(v);
  }
  return out;
}

export function cardRows(
  player: Player,
  players: readonly Player[],
  group: PositionGroup | null,
): CardRow[] {
  return CARD_SECTIONS.flatMap((section) =>
    section.rows.map(({ stat, label }): CardRow => {
      const def = CATALOG[stat];
      const pct = group ? player.pctPos?.[stat] : player.pct?.[stat];
      const ci = player.ci?.[stat];
      return {
        stat,
        label,
        value: player.s[stat],
        better: pct == null ? null : betterThan(stat, pct),
        band: pct != null && ci ? rankBand(ci, poolValues(players, stat, group), def.lowerIsBetter) : null,
        neutral: def.neutral,
      };
    }),
  );
}

export type CardInsights = {
  /** Better than ELITE% even at the unlucky end of his range. */
  elite: CardRow[];
  /** Worse than (100 - WEAK)% even at the lucky end. */
  weak: CardRow[];
  /** Top or bottom 10% so far, but no range confirms it (too wide, or none published yet). */
  unsettled: CardRow[];
};

/**
 * Only claims what the ranges support: elite and weak need a range, so a
 * stat without one can at most be "not settled"; a neutral one (usage) is
 * never judged.
 */
export function cardInsights(rows: readonly CardRow[]): CardInsights {
  const judged = rows.filter(
    (r): r is CardRow & { better: number; band: [number, number] } => !r.neutral && r.better != null && r.band != null,
  );
  const elite = judged.filter((r) => r.band[0] >= ELITE).sort((a, b) => b.band[0] - a.band[0]);
  const weak = judged.filter((r) => r.band[1] <= WEAK).sort((a, b) => a.band[1] - b.band[1]);
  // Standouts the ranges don't confirm, including stats with no range yet:
  // worth naming, never worth calling elite.
  const unsettled = rows
    .filter(
      (r): r is CardRow & { better: number } =>
        !r.neutral &&
        r.better != null &&
        !elite.includes(r as (typeof judged)[number]) &&
        !weak.includes(r as (typeof judged)[number]) &&
        (r.better >= STANDOUT || r.better <= 100 - STANDOUT),
    )
    .sort((a, b) => Math.abs(b.better - 50) - Math.abs(a.better - 50));
  return { elite, weak, unsettled };
}
