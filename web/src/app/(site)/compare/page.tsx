import type { Metadata } from 'next';

import { Compare, type Suggestion } from '@/components/compare/Compare';
import s from '@/components/compare/compare.module.css';
import { formatDate, seasonLabel } from '@/lib/format';
import { queryPlayers } from '@/players/query';
import { loadData, type SiteData } from '@/server/data';
import type { StatId } from '@/stats/catalog';
import type { PositionGroup } from '@/stats/views';

export function generateMetadata(): Metadata {
  const data = loadData();
  return {
    title: 'Compare Two Players: Who’s Better?',
    description: `Put any two players of ${seasonLabel(data.manifest.season)} head to head: 16 stats scored, each ranked against the ${data.manifest.qualifiedCount} qualified players, with an edge only called clear when it holds up allowing for luck. Plus how alike their styles are.`,
    alternates: { canonical: '/compare' },
  };
}

const MAX_SUGGESTIONS = 6;

/** Debates worth starting: the top two in a few leaderboards, by the same ranking as the players table. */
function suggestions(data: SiteData): Suggestion[] {
  const all = data.players.players;
  const rules = data.players.minAttempts;
  const top2 = (sort: StatId, position: PositionGroup | null = null) =>
    queryPlayers(all, { search: '', sort, qualifiedOnly: true, rules, position }).slice(0, 2);
  const candidates: [string, ReturnType<typeof top2>][] = [
    ['The two best by Game Score', top2('game_score')],
    ['The top two scorers', top2('pts')],
    ['The two best guards', top2('game_score', 'G')],
    ['The two best forwards', top2('game_score', 'F')],
    ['The two best centers', top2('game_score', 'C')],
    ['The top two passers', top2('ast')],
    ['The top two rebounders', top2('reb')],
    ['The two most efficient scorers', top2('ts_pct')],
  ];
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const [label, pair] of candidates) {
    if (pair.length < 2) continue;
    const key = [pair[0].id, pair[1].id].sort((x, y) => x - y).join('-');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, a: { id: pair[0].id, name: pair[0].name }, b: { id: pair[1].id, name: pair[1].name } });
    if (out.length === MAX_SUGGESTIONS) break;
  }
  return out;
}

export default function ComparePage() {
  const data = loadData();
  return (
    <div className={`wrap ${s.page}`}>
      <header className={s.header}>
        <h1 className="t-display-md">Who’s better?</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          Any two players, stat by stat, each ranked against the {data.manifest.qualifiedCount} qualified players. A win
          only counts as clear when it holds up allowing for luck.
        </p>
      </header>
      <Compare
        through={formatDate(data.through)}
        qualifiedCount={data.manifest.qualifiedCount}
        suggestions={suggestions(data)}
      />
    </div>
  );
}
