'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import c from '@/charts/charts.module.css';
import { ScatterChart, type ScatterTip } from '@/charts/ScatterChart';
import { Button, ButtonLink } from '@/components/Button';
import { ChartFrame } from '@/components/ChartFrame';
import { ChartIcon, ChevronDownIcon, CloseIcon, CompareIcon, PlusIcon, TableIcon } from '@/components/icons';
import { PlayerSearchDialog } from '@/components/PlayerSearchDialog';
import pt from '@/components/players/players.module.css';
import { Avatar, EmptyState, Note, PercentileBar, percentileColor, TeamChip } from '@/components/primitives';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { Player } from '@/data/types';
import {
  describeRelationship,
  median,
  pearson,
  quadrantCandidates,
  quadrantCounts,
  quadrantOf,
  sharedInputs,
  shortName,
  significanceThreshold,
  thinSamples,
  type QuadrantKey,
} from '@/graphs/analysis';
import { linearFit, type ChartPoint } from '@/graphs/math';
import { buildPoints, chartColumns, leftOut } from '@/graphs/points';
import { CUSTOM_ID, PRESETS, presetById } from '@/graphs/presets';
import { betterPct, betterThan, formatStat } from '@/lib/format';
import { comparePath, playerPath } from '@/lib/routes';
import { SITE } from '@/lib/site';
import { useQuery } from '@/lib/useQueryParam';
import { CATALOG, GROUPS, isStatId, STAT_IDS, statsInGroup, type StatDef, type StatId } from '@/stats/catalog';
import { attemptsText, hasSample, minimumsText, sampleFor, type AttemptRules } from '@/stats/samples';
import { groupNoun, POSITION_GROUPS, positionGroup, positionName, type PositionGroup } from '@/stats/views';

import s from './explore.module.css';
import { unpackExplorePlayer, type PackedExplorePlayer } from './exploreData';

const MAX_HIGHLIGHTS = 3;
const CUSTOM_DEFAULT = { x: 'age', y: 'pts', z: 'reb' } as const satisfies Record<string, StatId>;
/** A third stat as color uses the cold-to-hot scale, so only stats with a better and a worse end. */
const COLOR_STATS: ReadonlySet<StatId> = new Set(STAT_IDS.filter((id) => CATALOG[id].ranked && !CATALOG[id].neutral));
const POSITION_COLOR: Record<PositionGroup, string> = { G: 'var(--viz-pos-g)', F: 'var(--viz-pos-f)', C: 'var(--viz-pos-c)' };
const SCALE_STEPS = ['Bottom 20%', '20–40%', 'Middle', '60–80%', 'Top 20%'];

type PositionFilter = 'all' | PositionGroup;
const POSITIONS: readonly { id: PositionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...POSITION_GROUPS.map((g) => ({ id: g, label: groupNoun(g).replace(/^./, (ch) => ch.toUpperCase()) })),
];

const CORNERS: readonly { key: QuadrantKey; where: string }[] = [
  { key: 'topLeft', where: 'Top left' },
  { key: 'topRight', where: 'Top right' },
  { key: 'bottomLeft', where: 'Bottom left' },
  { key: 'bottomRight', where: 'Bottom right' },
];

/** "True shooting percentage" -> "true shooting percentage"; names stay capitalized. */
function lower(label: string): string {
  return label === 'Game Score' ? label : label[0].toLowerCase() + label.slice(1);
}

/** Controls use Title Case: "Efficiency vs. volume" -> "Efficiency vs. Volume". */
function titleCase(label: string): string {
  return label.replace(/(^|\s)([a-z])/g, (_, space: string, ch: string) => space + ch.toUpperCase()).replace(/\bVs\./, 'vs.');
}

function statParam(value: string | null, fallback: StatId): StatId {
  return value && isStatId(value) ? value : fallback;
}

function idsParam(value: string | null): number[] {
  return [...new Set((value ?? '').split(',').filter((v) => /^\d+$/.test(v)).map(Number))].slice(0, MAX_HIGHLIGHTS);
}

/** "A, B and C". */
function list(names: readonly string[]): string {
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

type Props = {
  packed: readonly PackedExplorePlayer[];
  rules: AttemptRules;
  /** "Nov 12, 2026" */
  through: string;
};

/**
 * The scatter playground. Every setting lives in the URL, so a chart can be
 * shared as a link: `?preset=playmaking&pos=G&hl=3975,6442`, or a custom
 * chart, `?x=age&y=pts&color=stat&z=reb&trend=1`.
 */
export function Explore({ packed, rules, through }: Props) {
  const [query, update] = useQuery();
  const players = useMemo(() => packed.map(unpackExplorePlayer), [packed]);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);

  // ---- Settings from the URL ----
  const presetParam = query.get('preset');
  const xParam = query.get('x');
  const yParam = query.get('y');
  const presetId =
    presetParam && (presetById(presetParam) || presetParam === CUSTOM_ID)
      ? presetParam
      : xParam || yParam
        ? CUSTOM_ID
        : PRESETS[0].id;
  const preset = presetById(presetId);
  const custom = !preset;
  const cx = statParam(xParam, CUSTOM_DEFAULT.x);
  const cy = statParam(yParam, CUSTOM_DEFAULT.y);
  const zParam = query.get('z');
  const cz: StatId = zParam && isStatId(zParam) && COLOR_STATS.has(zParam) ? zParam : CUSTOM_DEFAULT.z;
  const colorByStat = custom && query.get('color') === 'stat';
  const showTrend = custom && query.get('trend') === '1';
  const posParam = positionGroup(query.get('pos') ?? '');
  const position: PositionFilter = posParam ?? 'all';
  const highlights = idsParam(query.get('hl')).filter((id) => byId.has(id));
  const view = query.get('view') === 'table' ? 'table' : 'chart';

  const x = preset ? preset.x : cx;
  const y = preset ? preset.y : cy;
  const z = colorByStat ? cz : null;
  // "Up" means better: lower-is-better stats on the Y axis are drawn flipped.
  const invertY = preset ? !!preset.invertY : CATALOG[y].lowerIsBetter;
  const pos = posParam;
  const noun = pos ? groupNoun(pos) : 'players';
  const xLabel = lower(CATALOG[x].label);
  const yLabel = lower(CATALOG[y].label);
  const title = preset ? preset.question : `Does ${xLabel} go with ${yLabel}?`;

  const points = useMemo(() => buildPoints(players, x, y, z, rules, pos), [players, x, y, z, rules, pos]);
  const onChart = useMemo(() => new Set(points.map((p) => p.id)), [points]);
  const hlKey = highlights.join(',');

  const analysis = useMemo(() => {
    if (points.length < 5) return null;
    const mx = median(points.map((p) => p.x));
    const my = median(points.map((p) => p.y));
    const hollow = thinSamples(points);
    const picked = hlKey ? hlKey.split(',').map(Number) : [];
    const leaders = new Map<QuadrantKey, ChartPoint[]>();
    const pointById = new Map(points.map((p) => [p.id, p]));
    for (const { id, quadrant } of quadrantCandidates(points, mx, my, invertY, hollow, 5)) {
      leaders.set(quadrant, [...(leaders.get(quadrant) ?? []), pointById.get(id)!]);
    }
    return {
      medians: { x: mx, y: my },
      counts: quadrantCounts(points, mx, my, invertY),
      hollow,
      examples: quadrantCandidates(points, mx, my, invertY, new Set([...hollow, ...picked])),
      leaders,
      relationship: describeRelationship(points, xLabel, yLabel),
      fit: linearFit(points),
      r: pearson(
        points.map((p) => p.x),
        points.map((p) => p.y),
      ),
    };
  }, [points, invertY, hlKey, xLabel, yLabel]);

  const colors = useMemo(
    () =>
      points.map((p) => {
        if (z) {
          const pct = byId.get(p.id)?.pct?.[z];
          return pct == null ? 'var(--viz-mark)' : percentileColor(betterThan(z, pct));
        }
        const g = positionGroup(p.group ?? '');
        return g ? POSITION_COLOR[g] : 'var(--viz-mark)';
      }),
    [points, z, byId],
  );

  const quadrantNames: Record<QuadrantKey, string> | null =
    preset && analysis
      ? {
          topRight: `${preset.quadrants.topRight} (${analysis.counts.topRight})`,
          topLeft: `${preset.quadrants.topLeft} (${analysis.counts.topLeft})`,
          bottomLeft: `${preset.quadrants.bottomLeft} (${analysis.counts.bottomLeft})`,
          bottomRight: `${preset.quadrants.bottomRight} (${analysis.counts.bottomRight})`,
        }
      : null;

  const labels = useMemo(
    () => [
      ...(hlKey ? hlKey.split(',').map(Number) : []).map((id) => ({ id, text: shortName(byId.get(id)?.name ?? '') })),
      // Up to one example per corner: the first candidate whose name fits without covering anyone.
      ...(analysis?.examples ?? []).map(({ id, quadrant }) => ({ id, text: shortName(byId.get(id)?.name ?? ''), group: quadrant })),
    ],
    [hlKey, analysis, byId],
  );

  const used: StatId[] = z ? [x, y, z] : [x, y];
  const missing = leftOut(players, used, rules, pos);
  const under = minimumsText(used, rules);
  const shared = custom ? sharedInputs(x, y) : [];
  const columns = chartColumns(x, y, z);
  const selected = selectedId != null ? byId.get(selectedId) : undefined;

  // The tab title names the chart, so a saved or shared tab says what it holds.
  const isDefault = presetId === PRESETS[0].id;
  useEffect(() => {
    if (isDefault) return;
    const before = document.title;
    document.title = `${title} · ${SITE.name}`;
    return () => {
      document.title = before;
    };
  }, [title, isDefault]);

  // ---- Changing settings ----
  function choosePreset(id: string) {
    if (id === CUSTOM_ID) update({ preset: CUSTOM_ID, x: null, y: null, z: null, color: null, trend: null });
    else update({ preset: id === PRESETS[0].id ? null : id, x: null, y: null, z: null, color: null, trend: null });
  }
  /** Custom charts keep both axes in the URL, which is what marks them as custom. */
  function setCustom(patch: Record<string, string | null>) {
    update({ preset: null, x: cx, y: cy, ...patch });
  }
  function setHighlights(ids: number[]) {
    update({ hl: ids.length ? ids.join(',') : null });
  }
  function toggleHighlight(id: number) {
    setHighlights(highlights.includes(id) ? highlights.filter((v) => v !== id) : [...highlights, id].slice(-MAX_HIGHLIGHTS));
  }

  const tip = (p: ChartPoint): ScatterTip => {
    const player = byId.get(p.id);
    const corner = preset && analysis ? preset.quadrants[quadrantOf(p, analysis.medians.x, analysis.medians.y, invertY)] : null;
    return {
      title: p.name,
      meta: player ? `${positionName(player.pos)} · ${player.team}` : undefined,
      rows: columns.map(({ stat, axis }) => [CATALOG[stat].short, formatStat(stat, p[axis])] as const),
      note: analysis?.hollow.has(p.id) ? 'Under half the typical minutes' : (corner ?? undefined),
    };
  };
  const speak = (p: ChartPoint): string => {
    const corner = preset && analysis ? preset.quadrants[quadrantOf(p, analysis.medians.x, analysis.medians.y, invertY)] : null;
    const values = columns.map(({ stat, axis }) => `${lower(CATALOG[stat].label)} ${formatStat(stat, p[axis])}`).join(', ');
    return `${p.name}: ${values}.${corner ? ` ${corner}.` : ''}`;
  };

  function absentReason(p: Player): string | null {
    if (onChart.has(p.id)) return null;
    if (pos && positionGroup(p.pos) !== pos) return `This chart shows ${groupNoun(pos)} only.`;
    const none = used.find((st) => p.s[st] == null);
    if (none) return `No ${lower(CATALOG[none].label)} published for him yet.`;
    const thin = used.find((st) => !hasSample(p, st, rules));
    if (thin) {
      const sample = sampleFor(p, thin, rules);
      return `Too few attempts to rank his ${lower(CATALOG[thin].label)}${sample ? ` (${attemptsText(sample.have, sample.by)} of the ${sample.need} needed)` : ''}.`;
    }
    return 'Not on this chart.';
  }

  const relationship = analysis?.relationship;
  const topRight = preset && analysis ? (analysis.leaders.get('topRight') ?? []).slice(0, 3).map((p) => p.name) : [];
  const yCaption = `${CATALOG[y].label}${invertY ? ' (fewer is higher)' : ''}`;

  return (
    <>
      <div className={s.layout}>
        {/* ---------- Settings ---------- */}
        <section className={`${s.panel} ${s.rail}`} aria-labelledby="settings-title">
          <h2 id="settings-title" className="visually-hidden">
            Chart settings
          </h2>
          <div className={s.group}>
            <span id="question-label" className={`t-eyebrow ${s.groupLabel}`}>
              Question
            </span>
            <ChoiceChips
              labelledBy="question-label"
              options={[...PRESETS.map((p) => ({ id: p.id, label: titleCase(p.label) })), { id: CUSTOM_ID, label: 'Your Own Stats' }]}
              value={presetId}
              onChange={choosePreset}
            />
          </div>

          {custom ? (
            <div className={s.group}>
              <span className={`t-eyebrow ${s.groupLabel}`}>Your stats</span>
              <div className={s.fields}>
                <StatSelect id="stat-y" label="Up the Chart" value={cy} onChange={(v) => setCustom({ y: v })} />
                <StatSelect id="stat-x" label="Across the Chart" value={cx} onChange={(v) => setCustom({ x: v })} />
                <StatSelect
                  id="stat-color"
                  label="Color Dots By"
                  value={colorByStat ? cz : 'position'}
                  allow={COLOR_STATS}
                  extra={<option value="position">Position</option>}
                  onChange={(v) => setCustom(v === 'position' ? { color: null, z: null } : { color: 'stat', z: v })}
                />
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showTrend}
                className={pt.switch}
                onClick={() => setCustom({ trend: showTrend ? null : '1' })}>
                <span className={pt.switchTrack} aria-hidden="true">
                  <span className={pt.switchThumb} />
                </span>
                Straight-Line Trend
              </button>
            </div>
          ) : null}

          <div className={s.group}>
            <span className={`t-eyebrow ${s.groupLabel}`}>Position</span>
            <SegmentedControl
              label="Position"
              options={POSITIONS}
              value={position}
              onChange={(v) => update({ pos: v === 'all' ? null : v })}
            />
          </div>

          <div className={s.group}>
            <span id="highlight-label" className={`t-eyebrow ${s.groupLabel}`}>
              Highlighted players
            </span>
            <ul className={s.highlights} aria-labelledby="highlight-label">
              {highlights.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className={s.highlight}
                    aria-label={`Remove ${byId.get(id)?.name} from the chart`}
                    onClick={() => toggleHighlight(id)}>
                    {byId.get(id)?.name}
                    <CloseIcon size={14} />
                  </button>
                </li>
              ))}
              {highlights.length < MAX_HIGHLIGHTS ? (
                <li>
                  <Button icon={<PlusIcon />} onClick={() => setPicking(true)}>
                    {highlights.length ? 'Add a Player' : 'Highlight a Player'}
                  </Button>
                </li>
              ) : null}
            </ul>
            {highlights
              .filter((id) => !onChart.has(id))
              .map((id) => {
                const p = byId.get(id)!;
                return (
                  <p key={id} className="t-caption t-subtle">
                    {p.name} isn’t on this chart. {absentReason(p)}
                  </p>
                );
              })}
            <p className="t-caption t-subtle">
              {highlights.length < MAX_HIGHLIGHTS
                ? `Up to ${MAX_HIGHLIGHTS}, drawn larger and always named.`
                : `That’s ${MAX_HIGHLIGHTS}: remove one to add another.`}
            </p>
          </div>
        </section>

        {/* ---------- The chart ---------- */}
        <div className={s.chart}>
          <ChartFrame
            id="scatter"
            title={title}
            meta={
              <>
                {points.length} qualified {noun} · games through {through}
                {missing.smallSample > 0 && under ? ` · ${missing.smallSample} left out with ${under}` : ''}
                {missing.noValue > 0 ? ` · ${missing.noValue} without a value` : ''}
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
              analysis && relationship ? (
                <div className={s.answer}>
                  <p className={s.answerLead}>{relationship.text}</p>
                  {preset && topRight.length ? (
                    <p className="t-body-sm t-muted">
                      {preset.quadrants.topRight}, top right: {analysis.counts.topRight} of {points.length} {noun}. Furthest
                      out: {list(topRight)}.
                    </p>
                  ) : null}
                  {showTrend && Number.isFinite(analysis.r) ? (
                    <p className="t-body-sm t-muted">
                      The line is a least-squares fit (r = {(Math.abs(analysis.r) < 0.005 ? 0 : analysis.r).toFixed(2).replace('-', '−')}): the average trend,
                      not a rule for any one player.
                    </p>
                  ) : null}
                  {shared.length > 0 ? (
                    <Note>
                      Both stats are built from some of the same counts ({shared.join(', ').toUpperCase()}), so part of any
                      pattern between them is automatic.
                    </Note>
                  ) : null}
                </div>
              ) : undefined
            }
            howTo={
              <>
                {preset ? <p>{preset.note}</p> : null}
                <p>
                  Each dot is a qualified player: at least 10 minutes a game and enough games
                  {under ? `, and no fewer than ${under.replace(/^under /, '')}` : ''}. The dashed lines are the medians of
                  the players shown: half sit on each side, and the lines split the chart into four corners.
                  {invertY ? ` The ${yLabel} axis is flipped, so higher on the chart means fewer.` : ''}
                </p>
                <p>Hollow dots have played under half the typical minutes, so their numbers can still swing a lot.</p>
                <p>
                  The link is Spearman’s rank correlation (ρ): whether one stat tends to rise with the other, without
                  assuming a straight line. It is only called a link when it is stronger than chance would produce with
                  this many players (ρ beyond ±{significanceThreshold(points.length).toFixed(2)}).
                </p>
                {z ? (
                  <p>
                    Color shows how each player’s {lower(CATALOG[z].label)} ranks among all qualified players, from the
                    bottom fifth to the top fifth.
                  </p>
                ) : null}
                <p>Select a dot, or move with the arrow keys and press Enter, to see that player’s numbers.</p>
              </>
            }>
            {!analysis ? (
              <EmptyState title={`Not enough qualified ${noun} with these stats yet.`}>
                {pos ? 'Try all positions, or other stats.' : 'Try other stats.'}
              </EmptyState>
            ) : view === 'table' ? (
              <ValueTable
                points={points}
                columns={columns}
                invertY={invertY}
                highlights={highlights}
                corner={
                  preset ? (p) => preset.quadrants[quadrantOf(p, analysis.medians.x, analysis.medians.y, invertY)] : null
                }
                byId={byId}
                title={title}
              />
            ) : (
              <>
                <Legend z={z} trend={showTrend} highlights={highlights.length > 0} />
                <ScatterChart
                  points={points}
                  colors={colors}
                  xTitle={CATALOG[x].label}
                  yTitle={yCaption}
                  invertY={invertY}
                  hollow={analysis.hollow}
                  medians={analysis.medians}
                  quadrants={quadrantNames}
                  trend={showTrend ? analysis.fit : null}
                  highlightIds={highlights}
                  labels={labels}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  tip={tip}
                  speak={speak}
                  summary={`${title} ${points.length} ${noun}. ${relationship?.text ?? ''}`}
                />
              </>
            )}
          </ChartFrame>
        </div>

        {/* ---------- The selected player ---------- */}
        <section className={`${s.panel} ${s.player}`} aria-labelledby="player-title">
          <h2 id="player-title" className="t-card-title">
            Who’s this?
          </h2>
          {selected ? (
            <PlayerPanel
              player={selected}
              stats={columns.map((col) => col.stat)}
              absent={absentReason(selected)}
              highlighted={highlights.includes(selected.id)}
              canHighlight={highlights.length < MAX_HIGHLIGHTS}
              qualified={players.length}
              onToggleHighlight={() => toggleHighlight(selected.id)}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <p className="t-body-sm t-muted">
              Select a dot to see that player’s numbers here, ranked against all {players.length} qualified players.
            </p>
          )}
        </section>
      </div>

      {preset && analysis ? (
        <section className={s.section} aria-labelledby="corners-title">
          <header className={s.sectionHead}>
            <h2 id="corners-title" className="t-headline">
              Who’s in each corner?
            </h2>
            <p className="t-body-sm t-muted">
              Split at the medians of the {points.length} {noun} on the chart. Furthest from the middle first; hollow dots
              (under half the typical minutes) are left out.
            </p>
          </header>
          <div className={s.corners}>
            {CORNERS.map(({ key, where }) => {
              const leaders = analysis.leaders.get(key) ?? [];
              return (
                <section key={key} className={s.corner} aria-labelledby={`corner-${key}`}>
                  <header className={s.cornerHead}>
                    <span className={`t-eyebrow ${s.groupLabel}`}>{where}</span>
                    <h3 id={`corner-${key}`} className="t-card-title">
                      {preset.quadrants[key]}
                    </h3>
                    <p className="t-caption t-subtle num">
                      {analysis.counts[key]} {analysis.counts[key] === 1 ? 'player' : 'players'}
                    </p>
                  </header>
                  {leaders.length ? (
                    <ol className={s.cornerList}>
                      {leaders.map((p) => (
                        <li key={p.id}>
                          <Link href={playerPath(p)} className={s.cornerRow} prefetch={false}>
                            <span className={s.cornerName}>{p.name}</span>
                            <span className={`num t-caption ${s.cornerValues}`}>
                              {CATALOG[y].short} {formatStat(y, p.y)} · {CATALOG[x].short} {formatStat(x, p.x)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="t-body-sm t-muted">No one here with a full sample.</p>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      ) : null}

      <PlayerSearchDialog
        open={picking}
        title="Highlight a Player"
        placeholder="Search by name…"
        players={players}
        topLabel="Top players by Game Score"
        excludeIds={highlights}
        onPick={(id) => {
          setHighlights([...highlights, id].slice(-MAX_HIGHLIGHTS));
          setSelectedId(id);
        }}
        onClose={() => setPicking(false)}
      />
    </>
  );
}

/** A choice from a short list, as wrapping chips with radio semantics: arrow keys move and select. */
function ChoiceChips({
  labelledBy,
  options,
  value,
  onChange,
}: {
  labelledBy: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((o) => o.id === value);
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    else return;
    e.preventDefault();
    onChange(options[next].id);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }
  return (
    <div ref={ref} role="radiogroup" aria-labelledby={labelledBy} className={s.chips} onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          tabIndex={o.id === value ? 0 : -1}
          className={s.chip}
          onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const SELECT_GROUPS: readonly { title: string; stats: readonly StatDef[] }[] = [
  ...GROUPS.map((g) => ({ title: g.title, stats: statsInGroup(g.id) })),
  { title: 'Playing time and age', stats: statsInGroup('context') },
];

/** Any stat in the catalog, grouped as on the player page. A native select: keyboard, screen reader and phone pickers come free. */
function StatSelect({
  id,
  label,
  value,
  onChange,
  allow,
  extra,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  allow?: ReadonlySet<StatId>;
  extra?: ReactNode;
}) {
  return (
    <div className={s.field}>
      <label htmlFor={id} className={`t-caption ${s.fieldLabel}`}>
        {label}
      </label>
      <span className={s.selectWrap}>
        <select id={id} name={id} className={s.select} value={value} onChange={(e) => onChange(e.target.value)}>
          {extra}
          {SELECT_GROUPS.map((g) => {
            const stats = g.stats.filter((d) => !allow || allow.has(d.id));
            return stats.length ? (
              <optgroup key={g.title} label={g.title}>
                {stats.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>
        <ChevronDownIcon />
      </span>
    </div>
  );
}

function Legend({ z, trend, highlights }: { z: StatId | null; trend: boolean; highlights: boolean }) {
  return (
    <div className={c.legend} aria-hidden="true">
      {z ? (
        <>
          <span className={c.legendItem}>{CATALOG[z].short}, among all qualified players:</span>
          {SCALE_STEPS.map((step, i) => (
            <span key={step} className={c.legendItem}>
              <span className={c.swatchDot} style={{ background: `var(--viz-pct-${i + 1})` }} />
              {step}
            </span>
          ))}
        </>
      ) : (
        POSITION_GROUPS.map((g) => (
          <span key={g} className={c.legendItem}>
            <span className={c.swatchDot} style={{ background: POSITION_COLOR[g] }} />
            {groupNoun(g).replace(/^./, (ch) => ch.toUpperCase())}
          </span>
        ))
      )}
      <span className={c.legendItem}>
        <span className={s.swatchHollow} />
        Under half the typical minutes
      </span>
      <span className={c.legendItem}>
        <span className={c.swatchDash} />
        Median
      </span>
      {trend ? (
        <span className={c.legendItem}>
          <span className={c.swatchLine} />
          Straight-line fit
        </span>
      ) : null}
      {highlights ? (
        <span className={c.legendItem}>
          <span className={s.swatchPicked} />
          Highlighted
        </span>
      ) : null}
    </div>
  );
}

function PlayerPanel({
  player,
  stats,
  absent,
  highlighted,
  canHighlight,
  qualified,
  onToggleHighlight,
  onClose,
}: {
  player: Player;
  stats: readonly StatId[];
  absent: string | null;
  highlighted: boolean;
  canHighlight: boolean;
  qualified: number;
  onToggleHighlight: () => void;
  onClose: () => void;
}) {
  return (
    <div className={s.playerBody}>
      <p className="visually-hidden" role="status">
        {player.name} selected
      </p>
      <div className={s.playerHead}>
        <Avatar name={player.name} size={40} />
        <div className={s.playerTitles}>
          <Link href={playerPath(player)} className={`hit ${s.playerName}`} prefetch={false}>
            {player.name}
          </Link>
          <span className={s.playerMeta}>
            {positionName(player.pos)}
            <TeamChip abbr={player.team} />
          </span>
        </div>
        <button type="button" className={s.close} onClick={onClose} aria-label="Clear the selected player">
          <CloseIcon />
        </button>
      </div>
      {absent ? <Note>{absent}</Note> : null}
      <ul className={s.statRows} aria-label={`${player.name}: the stats on this chart`}>
        {stats.map((id) => {
          const def = CATALOG[id];
          const pct = player.pct?.[id];
          const better = pct == null ? null : betterThan(id, pct);
          return (
            <li key={id} className={s.statRow}>
              <span className={s.statLabel}>{def.label}</span>
              <span className={`num ${s.statValue}`}>{formatStat(id, player.s[id])}</span>
              {def.ranked ? (
                <>
                  <span className={s.statBar}>
                    <PercentileBar value={better} neutral={def.neutral} />
                  </span>
                  <span className={`t-caption num ${s.statRank}`}>
                    {better == null
                      ? 'Not ranked: too few attempts'
                      : def.neutral
                        ? `Higher than ${betterPct(better)}%`
                        : `Better than ${betterPct(better)}%`}
                  </span>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="t-caption t-subtle">Percentiles among all {qualified} qualified players.</p>
      <div className={s.playerActions}>
        {highlighted || canHighlight ? (
          <Button onClick={onToggleHighlight} aria-pressed={highlighted}>
            {highlighted ? 'Remove Highlight' : 'Highlight on Chart'}
          </Button>
        ) : null}
        <ButtonLink variant="tertiary" href={playerPath(player)}>
          Player Page
        </ButtonLink>
        <ButtonLink variant="tertiary" href={comparePath(player.id)} icon={<CompareIcon />}>
          Compare
        </ButtonLink>
      </div>
    </div>
  );
}

function ValueTable({
  points,
  columns,
  invertY,
  highlights,
  corner,
  byId,
  title,
}: {
  points: readonly ChartPoint[];
  columns: readonly { stat: StatId; axis: 'x' | 'y' | 'z' }[];
  invertY: boolean;
  highlights: readonly number[];
  corner: ((p: ChartPoint) => string) | null;
  byId: ReadonlyMap<number, Player>;
  title: string;
}) {
  // Best first on the up axis.
  const sorted = useMemo(
    () => [...points].sort((a, b) => (invertY ? a.y - b.y : b.y - a.y) || a.name.localeCompare(b.name)),
    [points, invertY],
  );
  return (
    <div className={s.tableBox} tabIndex={0} role="region" aria-label={`${title} as a table`}>
      <table className={s.table}>
        <caption className="visually-hidden">
          {title} Every player on the chart, {invertY ? 'fewest' : 'highest'} {lower(CATALOG[columns[0].stat].label)} first.
        </caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            {columns.map((col) => (
              <th key={col.stat} scope="col" className={s.right}>
                <abbr title={CATALOG[col.stat].label}>{CATALOG[col.stat].short}</abbr>
              </th>
            ))}
            {corner ? <th scope="col">Corner</th> : null}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const player = byId.get(p.id);
            return (
              <tr key={p.id} className={highlights.includes(p.id) ? s.marked : undefined}>
                <th scope="row">
                  <span className={s.tableName}>
                    <Link href={playerPath(p)} className={`hit ${s.tableLink}`} prefetch={false}>
                      {p.name}
                    </Link>
                    {player ? <TeamChip abbr={player.team} /> : null}
                    {highlights.includes(p.id) ? <span className="visually-hidden">(highlighted)</span> : null}
                  </span>
                </th>
                {columns.map((col) => (
                  <td key={col.stat} className={`num ${s.right}`}>
                    {formatStat(col.stat, p[col.axis])}
                  </td>
                ))}
                {corner ? <td>{corner(p)}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
