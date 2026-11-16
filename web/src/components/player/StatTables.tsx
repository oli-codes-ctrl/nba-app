import Link from 'next/link';
import { Fragment } from 'react';

import { PercentileBar } from '@/components/primitives';
import type { Player } from '@/data/types';
import { betterPct, betterThan, formatStat, rankText } from '@/lib/format';
import { statPath, type Pool } from '@/lib/routes';
import { CATALOG, GROUPS, statsInGroup, type StatDef, type StatGroup, type StatId } from '@/stats/catalog';
import { attemptsText, sampleFor, type AttemptRules } from '@/stats/samples';

import s from './player.module.css';

/** Groups measured against team totals: a traded player gets the average of his teams. */
const TEAM_BASED_GROUPS: ReadonlySet<StatGroup> = new Set<StatGroup>(['rates', 'per100']);

type Ranks = {
  pct: Partial<Record<StatId, number>> | undefined;
  rank: Partial<Record<StatId, number>> | undefined;
  size: Partial<Record<StatId, number>>;
};

type Props = {
  player: Player;
  ranks: Ranks;
  /** Who the ranks are among: "guards" or "players". */
  noun: string;
  pool: Pool;
  rules: AttemptRules | undefined;
  /** How the ranks were made, set after the last table. */
  method: string;
};

/** The stats a fan reaches for first: the short list the numbers section opens on, in two tables. */
export const KEY_STATS: readonly { title: string; stats: readonly StatId[] }[] = [
  { title: 'Per game', stats: ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'mpg'] },
  { title: 'Shooting and role', stats: ['fg_pct', 'fg3_pct', 'ft_pct', 'ts_pct', 'usg_pct', 'game_score'] },
];

/** The short list: the key stats in two plain tables, without sample notes. */
export function KeyStats({ player, ranks, noun, pool, rules }: Omit<Props, 'method'>) {
  return (
    <div className={s.keyTables}>
      {KEY_STATS.map((group) => (
        <section key={group.title} className={s.tableGroup} aria-labelledby={`key-${group.title}-${pool}`}>
          <h3 id={`key-${group.title}-${pool}`} className={`t-eyebrow ${s.groupTitle}`}>
            {group.title}
          </h3>
          <table className={s.table}>
            <Head ranked={player.q} />
            <tbody>
              {group.stats.map((id) => (
                <StatRow
                  key={id}
                  def={CATALOG[id]}
                  player={player}
                  pct={ranks.pct?.[id]}
                  rank={ranks.rank?.[id]}
                  poolSize={ranks.size[id]}
                  noun={noun}
                  pool={pool}
                  rules={rules}
                  notes={false}
                />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function Head({ ranked }: { ranked: boolean }) {
  return (
    <thead>
      <tr>
        <th scope="col">Stat</th>
        <th scope="col" className={s.right}>
          Value
        </th>
        {ranked ? (
          <>
            <th scope="col" className={s.pctHead}>
              <abbr title="Percentile: better than this share of the group">Pctl</abbr>
            </th>
            <th scope="col" className={s.right}>
              Rank
            </th>
          </>
        ) : null}
      </tr>
    </thead>
  );
}

/** The reference list: every published stat, grouped, as real tables. */
export function StatTables({ player, ranks, noun, pool, rules, method }: Props) {
  const traded = player.teams.length > 1;
  return (
    <div className={s.tables}>
      {GROUPS.map((g) => (
        <section key={g.id} className={s.tableGroup} data-group={g.id} aria-labelledby={`group-${g.id}-${pool}`}>
          <h3 id={`group-${g.id}-${pool}`} className={`t-eyebrow ${s.groupTitle}`}>
            {g.title}
          </h3>
          {g.note ? (
            <p className={`t-caption ${s.groupNote}`}>
              {g.note}
              {TEAM_BASED_GROUPS.has(g.id) && traded ? ' Traded this season, so these use the average of his teams.' : ''}
            </p>
          ) : null}
          <table className={s.table}>
            <Head ranked={player.q} />
            <tbody>
              {statsInGroup(g.id).map((def) => (
                <StatRow
                  key={def.id}
                  def={def}
                  player={player}
                  pct={ranks.pct?.[def.id]}
                  rank={ranks.rank?.[def.id]}
                  poolSize={ranks.size[def.id]}
                  noun={noun}
                  pool={pool}
                  rules={rules}
                />
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className={`t-caption t-subtle ${s.method}`}>{method}</p>
    </div>
  );
}

function StatRow({
  def,
  player,
  pct,
  rank,
  poolSize,
  noun,
  pool,
  rules,
  notes = true,
}: {
  def: StatDef;
  player: Player;
  pct: number | undefined;
  rank: number | undefined;
  poolSize: number | undefined;
  noun: string;
  pool: Pool;
  rules: AttemptRules | undefined;
  /** The sample size and likely range under the label; off in the short list. */
  notes?: boolean;
}) {
  const sample = sampleFor(player, def.id, rules);
  const better = pct == null ? null : betterThan(def.id, pct);
  // Qualified, but too few attempts for this percentage to be ranked yet.
  const waiting = better == null && player.q && sample != null && !sample.enough;
  const sampleLine = sample
    ? `On ${attemptsText(sample.have, sample.by)}` + (waiting ? `, ranked from ${sample.need}` : '')
    : null;
  // Long-run skill: the 95% range, plus the sample-adjusted estimate when
  // published. Worded as skill, since a cold or hot start can sit outside it.
  // Written out only for shot-based stats; other ranges show on the card.
  const ci = sample ? player.ci?.[def.id] : undefined;
  const adj = player.adj?.[def.id];
  const rangeParts = ci
    ? adj != null
      ? [`skill estimate ${adj.toFixed(1)}%`, `likely ${ci[0]}–${ci[1]}%`]
      : [`skill likely ${ci[0]}–${ci[1]}%`]
    : [];
  const value = formatStat(def.id, player.s[def.id]);

  return (
    <tr>
      <th scope="row">
        {def.ranked ? (
          <Link href={statPath(def.id, { player: player.id, pos: pool })} className={s.statLink} prefetch={false}>
            {def.label}
          </Link>
        ) : (
          def.label
        )}
        {notes && sampleLine ? (
          <span className={`t-caption num ${s.sample}`}>
            {sampleLine}
            {rangeParts.map((part, i) => (
              <Fragment key={part}>
                {i === 0 ? '; ' : ', '}
                <span>{part}</span>
              </Fragment>
            ))}
          </span>
        ) : null}
      </th>
      <td className={`num ${s.right} ${waiting ? s.waiting : s.value}`}>{value}</td>
      {player.q ? (
        <>
      <td className={s.pctCell}>
        {better != null ? (
          <span className={s.pct}>
            <span className="num">{Math.round(better)}</span>
            <PercentileBar value={better} neutral={def.neutral} />
            <span className="visually-hidden">
              {def.neutral ? 'higher' : 'better'} than {betterPct(better)} percent of qualified {noun}
            </span>
          </span>
        ) : waiting ? (
          <span className={s.pct}>
            <span aria-hidden="true">–</span>
            <PercentileBar value={null} />
          </span>
        ) : null}
      </td>
      <td className={`t-caption num ${s.right} ${s.rank}`}>
        {waiting
          ? 'Not ranked yet'
          : rank != null && poolSize
            ? rankText(def.id, rank, poolSize)
            : ''}
      </td>
        </>
      ) : null}
    </tr>
  );
}
