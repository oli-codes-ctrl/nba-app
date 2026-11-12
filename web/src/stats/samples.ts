/**
 * Sample sizes behind shooting percentages. The pipeline publishes each
 * player's attempt totals and, per stat, how many attempts it takes to be
 * ranked (scaled to the season so far). Everything that compares players on
 * a percentage goes through here, so a 1-for-1 shooter never tops a list.
 */
import type { AttemptKey, AttemptRule, Player } from '@/data/types';

import type { StatId } from './catalog';

export type AttemptRules = Partial<Record<StatId, AttemptRule>>;

export type Sample = { by: AttemptKey; have: number; need: number; enough: boolean };

const WORDS: Record<AttemptKey, readonly [string, string]> = {
  fga: ['shot', 'shots'],
  fg2a: ['two-point attempt', 'two-point attempts'],
  fg3a: ['three-point attempt', 'three-point attempts'],
  fta: ['free throw attempt', 'free throw attempts'],
};

/** "1 three-point attempt", "29 shots". */
export function attemptsText(n: number, by: AttemptKey): string {
  return `${n} ${WORDS[by][n === 1 ? 0 : 1]}`;
}

const SHORT: Record<AttemptKey, string> = { fga: 'FGA', fg2a: '2PA', fg3a: '3PA', fta: 'FTA' };

/** "60 3PA": for dense lists that already use stat abbreviations. */
export function attemptsShort(n: number, by: AttemptKey): string {
  return `${n} ${SHORT[by]}`;
}

/** The sample behind one of a player's shooting percentages; null for other stats or older data. */
export function sampleFor(p: Player, stat: StatId, rules: AttemptRules | undefined): Sample | null {
  const rule = rules?.[stat];
  if (!rule || !p.att) return null;
  const have = p.att[rule.by];
  return { by: rule.by, have, need: rule.min, enough: have >= rule.min };
}

/** "under 11 three-point attempts" for the stats in use that have a rule; null if none. */
export function minimumsText(stats: readonly StatId[], rules: AttemptRules | undefined): string | null {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const s of stats) {
    const rule = rules?.[s];
    if (!rule || seen.has(rule.by)) continue;
    seen.add(rule.by);
    parts.push(attemptsText(rule.min, rule.by));
  }
  return parts.length ? `under ${parts.join(' or ')}` : null;
}

/** Enough attempts to compare this stat fairly. Stats without an attempt rule always pass. */
export function hasSample(p: Player, stat: StatId, rules: AttemptRules | undefined): boolean {
  return sampleFor(p, stat, rules)?.enough ?? true;
}
