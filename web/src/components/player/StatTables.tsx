import Link from 'next/link';
import { Fragment, type CSSProperties } from 'react';

import { PercentileBar, percentileColor } from '@/components/primitives';
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

/**
 * The stats a fan reaches for first: the stat sheet the numbers section
 * opens on. Three bands of 6, 4 and 2 figures, so every figure takes two
 * columns of the page's 12 (the shooting and role bands share a row).
 */
export const KEY_STATS: readonly { id: string; title: string; stats: readonly StatId[] }[] = [
  { id: 'game', title: 'Per game', stats: ['pts', 'reb', 'ast', 'stl', 'blk', 'tov'] },
  { id: 'shooting', title: 'Shooting', stats: ['fg_pct', 'fg3_pct', 'ft_pct', 'ts_pct'] },
  { id: 'role', title: 'Role', stats: ['mpg', 'usg_pct'] },
];

/** The sheet's labels: its band heading says "per game", so the figures need only the word. */
const SHEET_LABELS: Partial<Record<StatId, string>> = {
  pts: 'Points',
  reb: 'Rebounds',
  ast: 'Assists',
  stl: 'Steals',
  blk: 'Blocks',
  tov: 'Turnovers',
  fg_pct: 'Field goal %',
  fg3_pct: 'Three-point %',
  ft_pct: 'Free throw %',
  ts_pct: 'True shooting %',
  mpg: 'Minutes a game',
  usg_pct: 'Usage rate',
};

/** The short list: the key stats as a stat sheet of large figures, each with a percentile meter and his rank. */
export function KeyStats({ player, ranks, noun, pool, rules }: Omit<Props, 'method'>) {
  return (
    <div className={s.sheet}>
      {KEY_STATS.map((band) => (
        <section
          key={band.id}
          className={s.band}
          data-band={band.id}
          style={{ '--n': band.stats.length } as CSSProperties}
          aria-labelledby={`key-${band.id}-${pool}`}>
          <h3 id={`key-${band.id}-${pool}`} className={`t-eyebrow ${s.bandTitle}`}>
            {band.title}
          </h3>
          <ul className={s.figures}>
            {band.stats.map((id) => (
              <Figure
                key={id}
                def={CATALOG[id]}
                player={player}
                pct={ranks.pct?.[id]}
                rank={ranks.rank?.[id]}
                poolSize={ranks.size[id]}
                noun={noun}
                pool={pool}
                rules={rules}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** One figure on the sheet: the word, the number set large, a meter filled to his percentile, his rank. */
function Figure({
  def,
  player,
  pct,
  rank,
  poolSize,
  noun,
  pool,
  rules,
}: {
  def: StatDef;
  player: Player;
  pct: number | undefined;
  rank: number | undefined;
  poolSize: number | undefined;
  noun: string;
  pool: Pool;
  rules: AttemptRules | undefined;
}) {
  const sample = sampleFor(player, def.id, rules);
  const better = pct == null ? null : betterThan(def.id, pct);
  const waiting = better == null && player.q && sample != null && !sample.enough;
  const value = formatStat(def.id, player.s[def.id]);
  // A trailing "%" is set smaller, as on a broadcast graphic.
  const percent = value.endsWith('%');
  const label = SHEET_LABELS[def.id] ?? def.label;
  const body = (
    <>
      <span className={s.figureLabel}>{label}</span>
      <span className={`t-score ${s.figureValue}`}>
        {percent ? value.slice(0, -1) : value}
        {percent ? <span className={s.figureUnit}>%</span> : null}
      </span>
      {player.q ? (
        <span className={s.meter} aria-hidden="true">
          {better != null && def.neutral ? (
            <span className={s.meterDot} style={{ left: `${better}%` }} />
          ) : better != null ? (
            <span className={s.meterFill} style={{ width: `${Math.max(2, better)}%`, background: percentileColor(better) }} />
          ) : null}
        </span>
      ) : null}
      {player.q ? (
        <span className={`t-caption num ${s.figureRank}`}>
          {waiting ? 'Not ranked yet' : rank != null && poolSize ? rankText(def.id, rank, poolSize) : 'Not ranked'}
        </span>
      ) : null}
      {better != null ? (
        <span className="visually-hidden">
          , {def.neutral ? 'higher' : 'better'} than {betterPct(better)} percent of qualified {noun}
        </span>
      ) : null}
    </>
  );
  return (
    <li className={s.figure}>
      {def.ranked ? (
        <Link href={statPath(def.id, { player: player.id, pos: pool })} className={s.figureBody} prefetch={false}>
          {body}
        </Link>
      ) : (
        <div className={s.figureBody}>{body}</div>
      )}
    </li>
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
}: {
  def: StatDef;
  player: Player;
  pct: number | undefined;
  rank: number | undefined;
  poolSize: number | undefined;
  noun: string;
  pool: Pool;
  rules: AttemptRules | undefined;
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
        {sampleLine ? (
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
