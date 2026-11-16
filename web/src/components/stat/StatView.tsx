'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import c from '@/charts/charts.module.css';
import { DistributionChart, type DistributionDot } from '@/charts/DistributionChart';
import type { ScatterTip } from '@/charts/ScatterChart';
import { Button } from '@/components/Button';
import { ChartFrame } from '@/components/ChartFrame';
import { ChartIcon, CloseIcon, PlusIcon, TableIcon } from '@/components/icons';
import { PlayerSearchDialog } from '@/components/PlayerSearchDialog';
import { EmptyState, StatTiles, TeamChip, type Tile } from '@/components/primitives';
import { SegmentedControl } from '@/components/SegmentedControl';
import tb from '@/components/table.module.css';
import type { AttemptRule } from '@/data/types';
import { shortName } from '@/graphs/analysis';
import { quantile, rankBand } from '@/graphs/distribution';
import { betterPct, betterThan, formatStat, ordinal, rankText } from '@/lib/format';
import { playerPath, statPath } from '@/lib/routes';
import { useQuery } from '@/lib/useQueryParam';
import { CATALOG, type StatId } from '@/stats/catalog';
import { attemptsText } from '@/stats/samples';
import { groupNoun, POSITION_GROUPS, positionGroup, positionName, type PositionGroup } from '@/stats/views';
import { teamInfo } from '@/theme/teams';

import s from './stat.module.css';
import { unpackStatRow, type PackedStatRow, type StatRow } from './statData';

const LEADERS = 10;
const POSITION_COLOR: Record<PositionGroup, string> = { G: 'var(--viz-pos-g)', F: 'var(--viz-pos-f)', C: 'var(--viz-pos-c)' };

type PositionFilter = 'all' | PositionGroup;
const POSITIONS: readonly { id: PositionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...POSITION_GROUPS.map((g) => ({ id: g, label: capital(groupNoun(g)) })),
];

function capital(text: string): string {
  return text.replace(/^./, (ch) => ch.toUpperCase());
}

/** "A guard", "a forward". */
function oneOf(g: PositionGroup): string {
  return `a ${groupNoun(g).slice(0, -1)}`;
}

type Props = {
  stat: StatId;
  packed: readonly PackedStatRow[];
  rule: AttemptRule | null;
  /** "Nov 12, 2026" */
  through: string;
  /** Other ranked stats in the same group, for the links at the end. */
  related: readonly StatId[];
  relatedTitle: string;
};

/**
 * One stat across the league. `?player=` marks a player and answers where
 * he ranks; `?pos=` ranks within one position, with the published
 * position percentiles. The static page shows everyone with no one marked.
 */
export function StatView({ stat, packed, rule, through, related, relatedTitle }: Props) {
  const def = CATALOG[stat];
  const [query, update] = useQuery();
  const [picking, setPicking] = useState(false);
  const rows = useMemo(() => packed.map(unpackStatRow), [packed]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const group = positionGroup(query.get('pos') ?? '');
  const position: PositionFilter = group ?? 'all';
  const playerParam = query.get('player');
  const player = playerParam && /^\d+$/.test(playerParam) ? byId.get(Number(playerParam)) : undefined;
  const view = query.get('view') === 'table' ? 'table' : 'chart';
  const noun = group ? groupNoun(group) : 'players';

  const pctOf = (r: StatRow) => (group ? r.pctPos : r.pct);
  const rankOf = (r: StatRow) => (group ? r.rankPos : r.rank);
  // The ranked pool: exactly the players with a published percentile here, best first
  // (published ranks count from the highest value, so for turnovers rank 1 is the most).
  const pool = useMemo(
    () =>
      rows
        .filter((r) => r.value != null && (group ? positionGroup(r.pos) === group && r.pctPos != null : r.pct != null))
        .sort((a, b) => (def.lowerIsBetter ? a.value! - b.value! : b.value! - a.value!) || a.id - b.id),
    [rows, group, def.lowerIsBetter],
  );
  const placeOf = (r: StatRow) => pool.indexOf(r) + 1;
  const poolValues = useMemo(() => pool.map((r) => r.value!), [pool]);
  const sorted = useMemo(() => [...poolValues].sort((a, b) => a - b), [poolValues]);
  const short = rows.filter((r) => r.q && r.value != null && pctOf(r) == null && (!group || positionGroup(r.pos) === group)).length;

  const inPool = player != null && pool.some((r) => r.id === player.id);
  const pct = player ? pctOf(player) : null;
  const rank = player ? rankOf(player) : null;
  const better = pct == null ? null : betterThan(stat, pct);
  const band = inPool && player?.ci ? rankBand(player.ci, poolValues, def.lowerIsBetter) : null;
  const med = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const best = pool[0];
  const enough = pool.length >= 5;
  const fmt = (v: number | null | undefined) => formatStat(stat, v);
  const more = def.neutral ? 'higher' : 'better';

  function setPlayer(id: number | null) {
    update({ player: id == null ? null : String(id) });
  }

  function absentReason(r: StatRow): string {
    if (!r.q) return 'not enough games or minutes yet';
    if (group && positionGroup(r.pos) !== group) return `this view ranks ${noun} only`;
    if (r.value == null) return 'no value published yet';
    if (rule && r.attempts != null) return `${attemptsText(r.attempts, rule.by)} so far, and it takes ${rule.min} to be ranked`;
    return 'not enough attempts yet';
  }

  const title = player ? `Where does ${shortName(player.name)} rank?` : 'Where does everyone stand?';
  const direction = def.neutral
    ? 'A role, not a ranking: right is higher, and neither end is better.'
    : def.lowerIsBetter
      ? 'Fewer is better, so the axis runs from most to fewest: right is better.'
      : 'Right is better.';

  const dots: DistributionDot[] = useMemo(
    () => pool.map((r) => ({ id: r.id, value: r.value!, color: POSITION_COLOR[positionGroup(r.pos) ?? 'G'] })),
    [pool],
  );
  const tip = (id: number): ScatterTip => {
    const r = byId.get(id)!;
    const p = pctOf(r);
    const k = rankOf(r);
    return {
      title: r.name,
      meta: `${teamInfo(r.team).name} ${positionName(r.pos).toLowerCase()}`,
      team: r.team,
      rows: [[def.short, fmt(r.value)], ...(k != null ? [['Rank', rankText(stat, k, pool.length)] as const] : [])],
      note: p != null ? `${capital(more)} than ${betterPct(betterThan(stat, p))}% of ${noun}` : undefined,
    };
  };
  const speak = (id: number) => {
    const r = byId.get(id)!;
    const k = rankOf(r);
    return `${r.name}: ${fmt(r.value)}${k != null ? `, ${rankText(stat, k, pool.length)}` : ''}.`;
  };

  const tiles: Tile[] = enough
    ? [
        { label: 'Median', value: fmt(med), note: `Half of the ${pool.length} ${noun} are above` },
        // The unit once, at the end: "55.1–65.9%".
        { label: 'Middle half', value: `${q1.toFixed(def.decimals)}–${fmt(q3)}`, note: 'From the 25th to the 75th percentile' },
        { label: def.lowerIsBetter ? 'Fewest' : 'Highest', value: fmt(best?.value), note: best?.name },
        player && inPool
          ? { label: shortName(player.name), value: fmt(player.value), note: rank != null ? rankText(stat, rank, pool.length) : undefined }
          : { label: 'Ranked', value: String(pool.length), note: `Qualified ${noun} with a value` },
      ]
    : [];

  const leaders = pool.slice(0, LEADERS);
  const showPlayerRow = player != null && inPool && !leaders.some((r) => r.id === player.id);

  return (
    <>
      {tiles.length ? <StatTiles tiles={tiles} label={`${def.label} at a glance`} phoneColumns={2} /> : null}

      <div className={s.toolbar}>
        <SegmentedControl
          label="Rank among"
          options={POSITIONS}
          value={position}
          onChange={(v) => update({ pos: v === 'all' ? null : v })}
        />
        {player ? (
          <button type="button" className={s.markChip} aria-label={`Unmark ${player.name}`} onClick={() => setPlayer(null)}>
            <span className={s.markDot} aria-hidden="true" />
            {player.name}
            <CloseIcon size={14} />
          </button>
        ) : null}
        <Button icon={<PlusIcon />} onClick={() => setPicking(true)}>
          {player ? 'Mark Someone Else' : 'Mark a Player'}
        </Button>
      </div>

      <div className={s.grid}>
        <ChartFrame
          id="distribution"
          title={title}
          meta={
            <>
              {def.label} · {pool.length} qualified {noun} · games through {through}
              {short > 0 && rule ? ` · ${short} left out with under ${attemptsText(rule.min, rule.by)}` : ''}
            </>
          }
          controls={
            <Button
              variant="tertiary"
              aria-pressed={view === 'table'}
              icon={view === 'table' ? <ChartIcon /> : <TableIcon />}
              onClick={() => update({ view: view === 'table' ? null : 'table' })}>
              {view === 'table' ? 'Chart' : 'Table'}
            </Button>
          }
          answer={
            <div className={s.answer}>
              {player && inPool && better != null ? (
                <p className={s.answerLead}>
                  {player.name}: {fmt(player.value)}, {more} than {betterPct(better)}% of qualified {noun}
                  {rank != null ? ` (${rankText(stat, rank, pool.length)})` : ''}.
                </p>
              ) : player ? (
                <p className={s.answerLead}>
                  {player.name} isn’t ranked here: {absentReason(player)}.
                  {group && player.q && positionGroup(player.pos) !== group && positionGroup(player.pos)
                    ? ` He is ${oneOf(positionGroup(player.pos)!)}.`
                    : ''}
                </p>
              ) : enough ? (
                <p className={s.answerLead}>
                  The median is {fmt(med)}; the middle half of qualified {noun} sit between {fmt(q1)} and {fmt(q3)}.
                  {best ? ` ${def.lowerIsBetter ? 'Fewest' : 'Highest'}: ${best.name}, ${fmt(best.value)}.` : ''}
                </p>
              ) : null}
              {band || (inPool && player?.adj != null) ? (
                <p className="t-body-sm t-muted">
                  {band
                    ? band[1] - band[0] >= 25
                      ? `Allowing for luck, his true rank could sit anywhere from the ${ordinal(Math.round(band[0]))} to the ${ordinal(Math.round(band[1]))} percentile, so it isn’t settled yet.`
                      : `Allowing for luck, his true rank sits between the ${ordinal(Math.round(band[0]))} and ${ordinal(Math.round(band[1]))} percentile.`
                    : ''}
                  {inPool && player?.adj != null ? `${band ? ' ' : ''}Skill estimate ${player.adj.toFixed(1)}%.` : ''}
                </p>
              ) : null}
            </div>
          }
          howTo={
            <>
              <p>
                Each dot is a qualified player with a ranked {def.label.toLowerCase()}: at least 10 minutes a game and
                enough games{rule ? `, and at least ${attemptsText(rule.min, rule.by)}` : ''}. {direction}
              </p>
              <p>
                The dashed line is the median; the shaded band holds the middle half, from the 25th to the 75th
                percentile. Percentiles count ties as half and are published with the data
                {group ? `, here among ${noun} only` : ''}.
              </p>
              <p>
                When a player is marked, the bracket under the axis is where his long-run number likely sits (95%),
                allowing for luck. It is only drawn for stats with a published range.
              </p>
              <p>Select a dot, or move with the arrow keys and press Enter, to mark that player.</p>
            </>
          }>
          {!enough ? (
            <EmptyState title={`Not enough ranked ${noun} for this stat yet.`}>Try all positions.</EmptyState>
          ) : view === 'table' ? (
            <RankTable stat={stat} pool={pool} pctOf={pctOf} markId={inPool ? player!.id : null} noun={noun} />
          ) : (
            <>
              <div className={c.legend} aria-hidden="true">
                {(group ? [group] : POSITION_GROUPS).map((g) => (
                  <span key={g} className={c.legendItem}>
                    <span className={c.swatchDot} style={{ background: POSITION_COLOR[g] }} />
                    {capital(groupNoun(g))}
                  </span>
                ))}
                <span className={c.legendItem}>
                  <span className={c.swatchBand} />
                  Middle half
                </span>
                <span className={c.legendItem}>
                  <span className={c.swatchDash} />
                  Median
                </span>
                {inPool && player?.ci ? (
                  <span className={c.legendItem}>
                    <span className={s.swatchBracket} />
                    His likely range
                  </span>
                ) : null}
                <span className={c.legendItem}>{def.neutral ? 'Right is higher' : def.lowerIsBetter ? 'Right is better (fewer)' : 'Right is better'}</span>
              </div>
              <DistributionChart
                dots={dots}
                reversed={def.lowerIsBetter}
                markId={inPool ? player!.id : null}
                markLabel={inPool ? `${shortName(player!.name)} ${fmt(player!.value)}` : undefined}
                range={inPool && player?.ci ? player.ci : null}
                format={(v) => fmt(v)}
                tip={tip}
                speak={speak}
                onPick={(id) => setPlayer(id)}
                summary={`${def.label} for ${pool.length} qualified ${noun}. Median ${fmt(med)}.`}
              />
            </>
          )}
        </ChartFrame>

        <section className={s.panel} aria-labelledby="leaders-title">
          <header className={s.panelHead}>
            <h2 id="leaders-title" className="t-card-title">
              {def.neutral ? 'Who’s highest?' : def.lowerIsBetter ? 'Who has the fewest?' : 'Who’s best?'}
            </h2>
            <p className="t-caption t-subtle">Top {Math.min(LEADERS, pool.length)} of {pool.length} qualified {noun}</p>
          </header>
          {leaders.length ? (
            <ol className={s.leaders}>
              {leaders.map((r) => (
                <LeaderRow key={r.id} row={r} place={placeOf(r)} stat={stat} marked={r.id === player?.id} />
              ))}
              {showPlayerRow ? (
                <>
                  <li className={s.gap} aria-hidden="true">
                    ⋯
                  </li>
                  <LeaderRow row={player!} place={placeOf(player!)} stat={stat} marked />
                </>
              ) : null}
            </ol>
          ) : (
            <p className="t-body-sm t-muted">No one is ranked yet.</p>
          )}
        </section>
      </div>

      {related.length ? (
        <nav className={s.related} aria-labelledby="related-title">
          <h2 id="related-title" className="t-eyebrow t-subtle">
            {relatedTitle}
          </h2>
          <ul className={s.relatedList}>
            {related.map((id) => (
              <li key={id}>
                <Link
                  href={statPath(id, { player: player?.id, pos: position })}
                  className={s.relatedLink}
                  prefetch={false}>
                  {CATALOG[id].label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <PlayerSearchDialog
        open={picking}
        title="Mark a Player"
        placeholder="Search by name…"
        players={rows}
        topLabel={`Best ${def.short} first`}
        excludeIds={player ? [player.id] : []}
        onPick={(id) => setPlayer(id)}
        onClose={() => setPicking(false)}
      />
    </>
  );
}

function LeaderRow({ row, place, stat, marked }: { row: StatRow; place: number; stat: StatId; marked: boolean }) {
  return (
    <li>
      <Link href={playerPath(row)} className={marked ? `${s.leader} ${s.leaderMarked}` : s.leader} prefetch={false}>
        <span className={`num ${s.leaderRank}`}>{place}</span>
        <span className={s.leaderName}>{row.name}</span>
        <TeamChip abbr={row.team} />
        <span className={`num ${s.leaderValue}`}>{formatStat(stat, row.value)}</span>
      </Link>
    </li>
  );
}

function RankTable({
  stat,
  pool,
  pctOf,
  markId,
  noun,
}: {
  stat: StatId;
  pool: readonly StatRow[];
  pctOf: (r: StatRow) => number | null;
  markId: number | null;
  noun: string;
}) {
  const def = CATALOG[stat];
  const ranges = pool.some((r) => r.ci != null);
  return (
    <div className={tb.tableBox} tabIndex={0} role="region" aria-label={`${def.label}, every ranked player`}>
      <table className={tb.table}>
        <caption className="visually-hidden">
          {def.label}: every qualified {noun.replace(/s$/, '')} ranked, {def.lowerIsBetter ? 'fewest' : 'highest'} first.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={tb.right}>
              <abbr title={def.lowerIsBetter ? 'Place, fewest first' : def.neutral ? 'Place, highest first' : 'Place, best first'}>
                #
              </abbr>
            </th>
            <th scope="col">Player</th>
            <th scope="col" className={tb.right}>
              {def.short}
            </th>
            <th scope="col" className={tb.right}>
              {def.neutral ? 'Higher than' : 'Better than'}
            </th>
            {ranges ? (
              <th scope="col" className={tb.right}>
                <abbr title="Where his long-run number likely sits (95%), allowing for luck">Likely range</abbr>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {pool.map((r, i) => {
            const p = pctOf(r);
            return (
              <tr key={r.id} className={r.id === markId ? tb.marked : undefined}>
                <td className={`num ${tb.right}`}>{i + 1}</td>
                <th scope="row">
                  <span className={tb.tableName}>
                    <Link href={playerPath(r)} className={`hit ${tb.tableLink}`} prefetch={false}>
                      {r.name}
                    </Link>
                    <TeamChip abbr={r.team} />
                  </span>
                </th>
                <td className={`num ${tb.right}`}>{formatStat(stat, r.value)}</td>
                <td className={`num ${tb.right}`}>{p == null ? '–' : `${betterPct(betterThan(stat, p))}%`}</td>
                {ranges ? (
                  <td className={`num ${tb.right}`}>
                    {r.ci ? `${r.ci[0]}–${r.ci[1]}${def.unit === 'percent' ? '%' : ''}` : '–'}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
