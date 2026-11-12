'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { Button } from '@/components/Button';
import { ChartFrame } from '@/components/ChartFrame';
import { ChartIcon, CompareIcon, SearchIcon, TableIcon } from '@/components/icons';
import { Avatar, ErrorState, Note, Skeleton, TeamChip } from '@/components/primitives';
import type { Player } from '@/data/types';
import { shortName } from '@/graphs/analysis';
import { betterPct, betterThan, formatStat } from '@/lib/format';
import { playerPath } from '@/lib/routes';
import { SITE } from '@/lib/site';
import { useQuery, useQueryParam } from '@/lib/useQueryParam';
import { cosine, drivers, STYLE_STATS, styleVectors } from '@/players/similar';
import { clearTally, tally, versusRows, type Side, type VersusRow } from '@/players/versus';
import { CATALOG, type StatId } from '@/stats/catalog';
import { attemptsShort, sampleFor, type AttemptRules } from '@/stats/samples';
import { positionName } from '@/stats/views';

import s from './compare.module.css';
import { matchesLayout, unpackComparePlayer, type CompareData } from './compareData';
import { DumbbellChart, type DumbbellGroup, type DumbbellRow } from './DumbbellChart';
import { Glyph } from './Glyph';
import { PlayerPicker } from './PlayerPicker';

type Loaded = { players: Player[]; byId: Map<number, Player>; rules: AttemptRules };

let dataPromise: Promise<Loaded> | null = null;
function loadCompareData(): Promise<Loaded> {
  dataPromise ??= fetch(`${SITE.basePath}/compare-data.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<CompareData>;
    })
    .then((data) => {
      if (!matchesLayout(data)) throw new Error('compare-data.json was packed by another build');
      const players = data.players.map(unpackComparePlayer);
      return { players, byId: new Map(players.map((p) => [p.id, p])), rules: data.rules };
    })
    .catch((error) => {
      dataPromise = null;
      throw error;
    });
  return dataPromise;
}

export type SuggestionPlayer = { id: number; name: string };
export type Suggestion = { label: string; a: SuggestionPlayer; b: SuggestionPlayer };

type Props = {
  /** "Nov 11, 2026" */
  through: string;
  qualifiedCount: number;
  /** Matchups picked at build time from the leaders. */
  suggestions: readonly Suggestion[];
};

/** Short names that read well in a sentence about a stat. */
const WORDS: Partial<Record<StatId, string>> = {
  game_score: 'Game Score',
  pts: 'points',
  reb: 'rebounds',
  ast: 'assists',
  stl: 'steals',
  blk: 'blocks',
  tov: 'fewer turnovers',
  fg3m: 'threes made',
  fg_pct: 'field goal %',
  fg3_pct: 'three-point %',
  ft_pct: 'free throw %',
  ts_pct: 'true shooting',
  ast_pct: 'assist share',
  reb_pct: 'rebound share',
  pts100: 'points per 100',
  ast100: 'assists per 100',
};

/** Row labels: the group heading says "per game", so the row can be short. */
const LABELS: Partial<Record<StatId, string>> = {
  game_score: 'Game Score',
  pts: 'Points',
  reb: 'Rebounds',
  ast: 'Assists',
  stl: 'Steals',
  blk: 'Blocks',
  tov: 'Turnovers',
  fg3m: 'Threes made',
  fg_pct: 'Field goal %',
  fg3_pct: 'Three-point %',
  ft_pct: 'Free throw %',
  ts_pct: 'True shooting %',
  ast_pct: 'Assist %',
  reb_pct: 'Rebound %',
  pts100: 'Points per 100',
  ast100: 'Assists per 100',
};

/** The head-to-head stats in their published order, in groups. */
const GROUPS: readonly { title: string; stats: readonly StatId[] }[] = [
  { title: 'Overall', stats: ['game_score'] },
  { title: 'Per game', stats: ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg3m'] },
  { title: 'Shooting', stats: ['fg_pct', 'fg3_pct', 'ft_pct', 'ts_pct'] },
  { title: 'Shares and per 100 possessions', stats: ['ast_pct', 'reb_pct', 'pts100', 'ast100'] },
];

/** Style positions are drawn from 3 SD below to 3 SD above average. */
const STYLE_SPAN = 3;
const VIEWS = ['chart', 'table'] as const;
type View = (typeof VIEWS)[number];

const subscribeNothing = () => () => {};

function parseId(raw: string | null): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Two players, stat by stat. The pair lives in the URL (`?a=&b=`), so a
 * matchup can be shared as a link. The static page renders the frame; the
 * players arrive with the compare data file once the page loads.
 */
export function Compare({ through, qualifiedCount, suggestions }: Props) {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [query, update] = useQuery();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [picking, setPicking] = useState<Side | null>(null);
  const next = useRef<Side | null>(null);
  const picked = useRef<Side | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    loadCompareData().then(setData, () => setFailed(true));
  }, []);
  useEffect(() => load(), [load]);

  const aId = parseId(query.get('a'));
  const bId = parseId(query.get('b'));
  const a = data && aId != null ? data.byId.get(aId) : undefined;
  const bFound = data && bId != null ? data.byId.get(bId) : undefined;
  // The same player on both sides is no matchup: keep player 1.
  const b = bFound && bFound.id !== a?.id ? bFound : undefined;
  const wanted = aId != null || bId != null;
  const loading = !hydrated || (wanted && !data && !failed);
  const missing = data ? [aId, bId].filter((id) => id != null && !data.byId.has(id)).length : 0;

  const rows = useMemo(() => (a && b && data ? versusRows(a, b, data.rules) : []), [a, b, data]);

  // The tab title names the matchup, so a saved or shared tab says what it holds.
  useEffect(() => {
    if (!a || !b) return;
    const before = document.title;
    document.title = `${a.name} vs. ${b.name}: Who’s Better? · ${SITE.name}`;
    return () => {
      document.title = before;
    };
  }, [a, b]);

  function open(side: Side) {
    picked.current = null;
    next.current = null;
    setPicking(side);
  }

  function onPick(side: Side, id: number) {
    update({ [side]: String(id), view: null, style: null }, 'push');
    picked.current = side;
    const other: Side = side === 'a' ? 'b' : 'a';
    const otherFilled = other === 'a' ? a != null : b != null;
    // Picking the first player moves straight on to the second.
    next.current = otherFilled ? null : other;
  }

  function onClose() {
    const then = next.current;
    next.current = null;
    setPicking(then);
    if (!then && picked.current) {
      const side = picked.current;
      picked.current = null;
      // The control that opened the picker is gone once a player fills the side: focus that side's Change button.
      window.requestAnimationFrame(() => document.getElementById(`change-${side}`)?.focus());
    }
  }

  function swap() {
    if (!a || !b) return;
    update({ a: String(b.id), b: String(a.id) });
  }

  function goTo(e: MouseEvent<HTMLAnchorElement>, pair: Suggestion) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    update({ a: String(pair.a.id), b: String(pair.b.id), view: null, style: null }, 'push');
    window.scrollTo({ top: 0 });
  }

  const t = tally(rows);
  const c = clearTally(rows);
  const both = a != null && b != null;

  return (
    <>
      <section className={s.board} aria-label="The matchup">
        <div className={s.slots}>
          <Slot
            side="a"
            player={a}
            loading={loading && aId != null}
            score={both ? t.a : null}
            clear={both ? c.a : null}
            lead={both ? t.a > t.b : false}
            primary={!a}
            onPick={() => open('a')}
          />
          <span className={`t-eyebrow ${s.vs}`} aria-hidden="true">
            vs
          </span>
          <Slot
            side="b"
            player={b}
            loading={loading && bId != null}
            score={both ? t.b : null}
            clear={both ? c.b : null}
            lead={both ? t.b > t.a : false}
            primary={a != null && !b}
            onPick={() => open('b')}
          />
        </div>

        {failed ? (
          <ErrorState title="The player data didn’t load." actions={<Button onClick={load}>Try Again</Button>}>
            Check your connection and try again.
          </ErrorState>
        ) : both ? (
          <div className={s.result}>
            <Verdict a={a} b={b} rows={rows} />
            <div className={s.actions}>
              <Button icon={<CompareIcon />} onClick={swap}>
                Swap Sides
              </Button>
              <CopyLink />
            </div>
          </div>
        ) : loading ? (
          <div className={s.result} aria-hidden="true">
            <Skeleton height={20} width="min(560px, 100%)" />
            <Skeleton height={16} width="min(420px, 80%)" />
          </div>
        ) : (
          <div className={s.prompt}>
            <p className="t-body">
              {a
                ? `Now pick someone to put against ${a.name}.`
                : 'Pick two players, or start from one of the matchups below.'}{' '}
              Every stat is scored, and an edge only counts as clear when it holds up allowing for luck.
            </p>
          </div>
        )}
      </section>

      {missing > 0 ? (
        <Note>
          {missing === 1 ? 'A player in this link isn’t' : 'The players in this link aren’t'} in this season’s data. Pick
          another to compare.
        </Note>
      ) : null}
      {both && (!a.q || !b.q) ? (
        <Note>
          {[a, b]
            .filter((p) => !p.q)
            .map((p) => p.name)
            .join(' and ')}{' '}
          {a.q || b.q ? 'hasn’t' : 'haven’t'} played enough games or minutes to be ranked yet: the numbers count, but
          there are no percentile marks, and most edges can’t be tested for luck.
        </Note>
      ) : null}

      {both && data ? (
        <div className={s.grid}>
          <VersusPanel a={a} b={b} rows={rows} rules={data.rules} through={through} qualifiedCount={qualifiedCount} />
          <StylePanel a={a} b={b} data={data} />
        </div>
      ) : loading ? (
        <div className={s.grid} aria-hidden="true">
          <Skeleton height={640} radius="var(--radius-xl)" />
          <Skeleton height={520} radius="var(--radius-xl)" />
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <section className={s.more} aria-labelledby="more-title">
          <h2 id="more-title" className="t-card-title">
            {both ? 'Who else is up for debate?' : 'Need a matchup to start?'}
          </h2>
          <ul className={s.suggestions}>
            {suggestions.map((pair) => (
              <li key={`${pair.a.id}-${pair.b.id}`}>
                <a
                  href={`${SITE.basePath}/compare/?a=${pair.a.id}&b=${pair.b.id}`}
                  className={s.suggestion}
                  aria-current={pair.a.id === a?.id && pair.b.id === b?.id ? 'true' : undefined}
                  onClick={(e) => goTo(e, pair)}>
                  <span className={s.suggestionFaces} aria-hidden="true">
                    <Avatar name={pair.a.name} size={32} />
                    <Avatar name={pair.b.name} size={32} />
                  </span>
                  <span className={`t-caption ${s.suggestionLabel}`}>{pair.label}</span>
                  <span className={s.suggestionPair}>
                    <span className={s.suggestionName}>
                      <Glyph side="a" size={8} />
                      {pair.a.name}
                    </span>
                    <span className={s.suggestionName}>
                      <Glyph side="b" size={8} />
                      {pair.b.name}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PlayerPicker
        side={picking}
        players={data?.players ?? []}
        loading={!data && !failed}
        excludeId={picking === 'a' ? (b?.id ?? null) : (a?.id ?? null)}
        onPick={onPick}
        onClose={onClose}
      />
    </>
  );
}

function Slot({
  side,
  player,
  loading,
  score,
  clear,
  lead,
  primary,
  onPick,
}: {
  side: Side;
  player: Player | undefined;
  loading: boolean;
  score: number | null;
  clear: number | null;
  lead: boolean;
  primary: boolean;
  onPick: () => void;
}) {
  const label = side === 'a' ? 'Player 1' : 'Player 2';
  return (
    <div className={`${s.slot} ${side === 'b' ? s.slotB : ''}`}>
      <div className={s.who}>
        <p className={`t-eyebrow ${s.kicker}`}>
          <Glyph side={side} />
          {label}
        </p>
        {loading ? (
          <div className={s.identity} aria-hidden="true">
            <Skeleton height={48} width={48} radius="50%" />
            <span className={s.identityText}>
              <Skeleton height={24} width={180} />
              <Skeleton height={16} width={140} />
            </span>
          </div>
        ) : player ? (
          <>
            <div className={s.identity}>
              <Avatar name={player.name} size={48} />
              <span className={s.identityText}>
                <Link href={playerPath(player)} className={`hit ${s.name}`} prefetch={false}>
                  {player.name}
                </Link>
                <span className={`t-body-sm ${s.meta}`}>
                  <TeamChip abbr={player.team} />
                  <span>{positionName(player.pos)}</span>
                  <span className="num">
                    {count(player.s.gp ?? 0, 'game', 'games').replace(' ', ' ')} · {formatStat('mpg', player.s.mpg)}
                    {' '}min
                  </span>
                </span>
              </span>
            </div>
            <Button id={`change-${side}`} variant="tertiary" className={s.change} onClick={onPick} aria-label={`Change ${label}`}>
              Change
            </Button>
          </>
        ) : (
          <Button
            id={`pick-${side}`}
            variant={primary ? 'primary' : 'secondary'}
            icon={<SearchIcon />}
            className={s.pick}
            onClick={onPick}>
            Pick {label}
          </Button>
        )}
      </div>

      {score != null && player ? (
        <p className={s.score}>
          <span className={`num ${s.scoreNum} ${lead ? s.lead : ''}`}>
            {score}
            <span className="visually-hidden"> stats won by {player.name},</span>
          </span>
          <span className={`t-caption num ${s.scoreNote}`}>
            <span aria-hidden="true">won · </span>
            {clear} clear
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** The answer in words: who wins more stats, and how many of those edges hold up allowing for luck. */
function Verdict({ a, b, rows }: { a: Player; b: Player; rows: readonly VersusRow[] }) {
  const t = tally(rows);
  const c = clearTally(rows);
  const n = rows.length;
  const unscored = rows.filter((r) => r.smallSample).length;
  const tested = rows.some((r) => r.clear != null);
  const sa = shortName(a.name);
  const sb = shortName(b.name);
  const leader = t.a > t.b ? a : b;

  const headline = t.a === t.b ? `Dead even: ${count(t.a, 'stat', 'stats')} each.` : `${leader.name} wins ${Math.max(t.a, t.b)} of ${n} stats.`;
  const close = c.close ? `; ${count(c.close, 'stat is', 'stats are')} too close to call` : '';
  const luck = !tested
    ? 'No luck ranges are published for players who aren’t qualified yet, so no edge can be tested.'
    : c.a + c.b === 0
      ? `Allowing for luck, no edge is clear yet${close}.`
      : `Allowing for luck, ${sa} has ${count(c.a, 'clear edge', 'clear edges')} and ${sb} ${c.b}${close}.`;

  return (
    <div className={s.verdict} role="status" aria-live="polite">
      <p className={`t-headline ${s.headline}`}>{headline}</p>
      <p className={`t-body ${s.luck}`}>
        {luck}
        {unscored ? ` ${count(unscored, 'stat isn’t', 'stats aren’t')} scored: too few attempts.` : ''}
      </p>
    </div>
  );
}

function CopyLink() {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <>
      <Button
        onClick={() =>
          navigator.clipboard.writeText(window.location.href).then(
            () => setState('copied'),
            () => setState('failed'),
          )
        }>
        {state === 'copied' ? 'Link Copied' : 'Copy Link'}
      </Button>
      <span className={`t-caption ${s.copyStatus}`} role="status" aria-live="polite">
        {state === 'failed' ? 'Couldn’t copy. Copy the address bar instead.' : ''}
      </span>
    </>
  );
}

function betterOf(p: Player, stat: StatId): number | null {
  const pct = p.pct?.[stat];
  return pct == null ? null : betterThan(stat, pct);
}

function rangeText(p: Player, stat: StatId): string | null {
  const r = p.ci?.[stat];
  return r ? `${formatStat(stat, r[0])} to ${formatStat(stat, r[1])}` : null;
}

function VersusPanel({
  a,
  b,
  rows,
  rules,
  through,
  qualifiedCount,
}: {
  a: Player;
  b: Player;
  rows: readonly VersusRow[];
  rules: AttemptRules;
  through: string;
  qualifiedCount: number;
}) {
  const [view, setView] = useQueryParam<View>('view', 'chart', VIEWS);
  const byStat = new Map(rows.map((r) => [r.stat, r]));
  const sa = shortName(a.name);
  const sb = shortName(b.name);
  const nameOf = (side: Side) => (side === 'a' ? sa : sb);

  function outcome(r: VersusRow): { node: ReactNode; text: string } {
    if (r.smallSample) {
      return { node: <span className={s.quiet}>Too few attempts</span>, text: 'Not scored: too few attempts' };
    }
    if (r.winner == null) return { node: <span className={s.quiet}>No data</span>, text: 'Not scored: no value' };
    if (r.winner === 'tie') return { node: 'Even', text: 'Even' };
    const who = nameOf(r.winner);
    if (r.clear === true) {
      return {
        node: (
          <>
            <Glyph side={r.winner} size={8} />
            Clear edge
          </>
        ),
        text: `Clear edge for ${who}, allowing for luck`,
      };
    }
    if (r.clear === false) {
      return { node: <span className={s.quiet}>Too close to call</span>, text: `${who} ahead, but too close to call` };
    }
    return {
      node: (
        <>
          <Glyph side={r.winner} size={8} />
          Ahead
        </>
      ),
      text: `${who} ahead; no range to test it`,
    };
  }

  function sampleNote(p: Player, stat: StatId): string | null {
    const sample = sampleFor(p, stat, rules);
    return sample && !sample.enough ? `${attemptsShort(sample.have, sample.by)}, needs ${sample.need}` : null;
  }

  const groups: DumbbellGroup[] = GROUPS.map((g) => ({
    title: g.title,
    rows: g.stats
      .map((stat) => byStat.get(stat))
      .filter((r): r is VersusRow => r != null)
      .map((r): DumbbellRow => {
        const ba = betterOf(a, r.stat);
        const bb = betterOf(b, r.stat);
        const o = outcome(r);
        const line = (p: Player, value: number | null, better: number | null) =>
          `${p.name} ${formatStat(r.stat, value)}${better != null ? `, better than ${betterPct(better)}%` : ''}`;
        return {
          id: r.stat,
          label: LABELS[r.stat] ?? CATALOG[r.stat].label,
          a: ba,
          b: bb,
          aValue: formatStat(r.stat, r.a),
          bValue: formatStat(r.stat, r.b),
          strong: (r.winner === 'a' || r.winner === 'b') && r.clear !== false ? r.winner : null,
          verdict: o.node,
          muted: r.smallSample,
          emptyText: 'Not ranked',
          sentence: `${CATALOG[r.stat].label}: ${line(a, r.a, ba)}; ${line(b, r.b, bb)}. ${o.text}.`,
          tip: (
            <>
              <div className={s.tipTitle}>{CATALOG[r.stat].label}</div>
              {(['a', 'b'] as const).map((side) => {
                const p = side === 'a' ? a : b;
                const better = side === 'a' ? ba : bb;
                const range = rangeText(p, r.stat);
                const thin = sampleNote(p, r.stat);
                return (
                  <div key={side} className={s.tipPlayer}>
                    <div className={s.tipLine}>
                      <Glyph side={side} size={8} />
                      <span className={s.tipName}>{nameOf(side)}</span>
                      <span className={`num ${s.tipValue}`}>{formatStat(r.stat, side === 'a' ? r.a : r.b)}</span>
                    </div>
                    <div className={`num ${s.tipSub}`}>
                      {better != null ? `Better than ${betterPct(better)}%` : 'Not ranked'}
                      {range ? ` · likely ${range}` : ''}
                      {thin ? ` · ${thin}` : ''}
                    </div>
                  </div>
                );
              })}
              <div className={s.tipNote}>{o.text}.</div>
            </>
          ),
        };
      }),
  }));

  // The clearest edges each way, biggest percentile gap first.
  const gap = (r: VersusRow) => Math.abs((betterOf(a, r.stat) ?? 0) - (betterOf(b, r.stat) ?? 0));
  const clearFor = (side: Side) =>
    rows
      .filter((r) => r.winner === side && r.clear === true)
      .sort((x, y) => gap(y) - gap(x))
      .slice(0, 4)
      .map((r) => WORDS[r.stat] ?? CATALOG[r.stat].label);
  const edges = (['a', 'b'] as const).map((side) => ({ side, list: clearFor(side) })).filter((e) => e.list.length > 0);

  return (
    <ChartFrame
      id="versus"
      title="Who wins each stat?"
      meta={`Percentile among ${qualifiedCount} qualified players · games through ${through}`}
      controls={
        <Button
          variant="tertiary"
          aria-pressed={view === 'table'}
          icon={view === 'table' ? <ChartIcon /> : <TableIcon />}
          onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
          {view === 'table' ? 'Chart' : 'Table'}
        </Button>
      }
      answer={
        edges.length === 0 ? (
          <p>No single stat clearly separates them yet, allowing for luck.</p>
        ) : (
          <dl className={s.edges}>
            {edges.map((e) => (
              <div key={e.side} className={s.edgeLine}>
                <dt className="t-eyebrow">
                  <Glyph side={e.side} size={8} />
                  {nameOf(e.side)} clearly
                </dt>
                <dd>{e.list.join(', ')}</dd>
              </div>
            ))}
          </dl>
        )
      }
      howTo={
        <>
          <p>
            Each line runs from the worst qualified player (left) to the best (right), so stats in different units line
            up. The filled dot is {a.name}, the ring {b.name}. For turnovers, fewer counts as better.
          </p>
          <p>
            A clear edge means the gap between their long-run estimates is bigger than luck would explain (95%), using
            each player’s published range. Too close to call means the better number could still be luck. Ahead means
            no range is published to test it (players not yet qualified).
          </p>
          <p>
            Shooting percentages are only scored when both players have enough attempts. Bold numbers are wins that
            hold up.
          </p>
        </>
      }>
      {view === 'table' ? (
        <div className={s.tableScroll} tabIndex={0} role="region" aria-label="Head-to-head table">
          <table className={s.table}>
            <caption className="visually-hidden">
              {a.name} and {b.name}, stat by stat, with each one’s percentile among qualified players
            </caption>
            <thead>
              <tr>
                <th scope="col">Stat</th>
                <th scope="col" className={s.right}>
                  {sa}
                </th>
                <th scope="col" className={s.right}>
                  Better than
                </th>
                <th scope="col" className={s.right}>
                  {sb}
                </th>
                <th scope="col" className={s.right}>
                  Better than
                </th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ba = betterOf(a, r.stat);
                const bb = betterOf(b, r.stat);
                return (
                  <tr key={r.stat}>
                    <th scope="row">{CATALOG[r.stat].label}</th>
                    <td className={`num ${s.right} ${r.winner === 'a' && r.clear !== false ? s.strong : ''}`}>
                      {formatStat(r.stat, r.a)}
                    </td>
                    <td className={`num ${s.right}`}>{ba != null ? `${betterPct(ba)}%` : '–'}</td>
                    <td className={`num ${s.right} ${r.winner === 'b' && r.clear !== false ? s.strong : ''}`}>
                      {formatStat(r.stat, r.b)}
                    </td>
                    <td className={`num ${s.right}`}>{bb != null ? `${betterPct(bb)}%` : '–'}</td>
                    <td>{outcome(r).text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <Legend a={a} b={b} note="Percentile · right is better" />
          <DumbbellChart
            layout="wide"
            groups={groups}
            ticks={[
              { at: 0, label: '0' },
              { at: 50, label: '50' },
              { at: 100, label: '100' },
            ]}
            summary={`${a.name} against ${b.name} in ${rows.length} stats, each as a percentile among qualified players.`}
          />
        </>
      )}
    </ChartFrame>
  );
}

function Legend({ a, b, note }: { a: Player; b: Player; note: string }) {
  return (
    <div className={s.legend}>
      <span className={s.legendItem}>
        <Glyph side="a" />
        {a.name}
      </span>
      <span className={s.legendItem}>
        <Glyph side="b" />
        {b.name}
      </span>
      <span className={s.legendNote}>{note}</span>
    </div>
  );
}

function zText(z: number): string {
  if (Math.abs(z) < 0.05) return 'at the average';
  return `${Math.abs(z).toFixed(1)} SD ${z > 0 ? 'above' : 'below'} average`;
}

/** "Do they play the same way?": the two style profiles side by side, and how alike they are. */
function StylePanel({ a, b, data }: { a: Player; b: Player; data: Loaded }) {
  const [view, setView] = useQueryParam<View>('style', 'chart', VIEWS);
  const vectors = useMemo(() => styleVectors(data.players, data.rules), [data]);
  const va = vectors.get(a.id);
  const vb = vectors.get(b.id);
  const sa = shortName(a.name);
  const sb = shortName(b.name);

  const howTo = (
    <>
      <p>
        Style, not quality: usage, shot diet, efficiency, passing, boards and defense, each compared with the average
        qualified player. Right means more of it than average, not better (more turnovers is to the right too).
      </p>
      <p>
        SD is a standard deviation: how far a player sits from average, in units of the usual spread between players.
        Dots past 3 SD sit at the edge. The match is the cosine similarity of the two profiles, times 100: 100 is the
        same shape, 0 unrelated, below 0 opposite.
      </p>
    </>
  );

  if (!va || !vb) {
    return (
      <ChartFrame id="style" title="Do they play alike?" howTo={howTo}>
        <p className={`t-body-sm ${s.quietText}`}>
          A style match needs both players qualified, with enough shots for every style stat. {[a, b].filter((p) => !vectors.has(p.id)).map((p) => p.name).join(' and ')}{' '}
          {vectors.has(a.id) || vectors.has(b.id) ? 'isn’t' : 'aren’t'} there yet.
        </p>
      </ChartFrame>
    );
  }

  const match = Math.round(100 * cosine(va, vb));
  const shared = drivers(va, vb);
  const gaps = STYLE_STATS.map((stat, i) => ({ stat, i, diff: va[i] - vb[i] }))
    .filter((g) => Math.abs(g.diff) >= 1)
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))
    .slice(0, 2);
  const position = (z: number) => ((Math.max(-STYLE_SPAN, Math.min(STYLE_SPAN, z)) + STYLE_SPAN) / (2 * STYLE_SPAN)) * 100;

  const rows: DumbbellRow[] = STYLE_STATS.map((stat, i) => {
    const label = CATALOG[stat].label;
    const av = formatStat(stat, a.s[stat]);
    const bv = formatStat(stat, b.s[stat]);
    return {
      id: stat,
      label,
      a: position(va[i]),
      b: position(vb[i]),
      aValue: av,
      bValue: bv,
      sentence: `${label}: ${a.name} ${av}, ${zText(va[i])}; ${b.name} ${bv}, ${zText(vb[i])}.`,
      tip: (
        <>
          <div className={s.tipTitle}>{label}</div>
          {(['a', 'b'] as const).map((side) => (
            <div key={side} className={s.tipPlayer}>
              <div className={s.tipLine}>
                <Glyph side={side} size={8} />
                <span className={s.tipName}>{side === 'a' ? sa : sb}</span>
                <span className={`num ${s.tipValue}`}>{side === 'a' ? av : bv}</span>
              </div>
              <div className={`num ${s.tipSub}`}>{zText(side === 'a' ? va[i] : vb[i])}</div>
            </div>
          ))}
        </>
      ),
    };
  });

  return (
    <ChartFrame
      id="style"
      title="Do they play alike?"
      meta="Ten style stats against the average qualified player"
      controls={
        <Button
          variant="tertiary"
          aria-pressed={view === 'table'}
          icon={view === 'table' ? <ChartIcon /> : <TableIcon />}
          onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
          {view === 'table' ? 'Chart' : 'Table'}
        </Button>
      }
      answer={
        <div className={s.styleAnswer}>
          <p className={s.match}>
            <span className={`num ${s.matchNum}`}>{match}</span>
            <span className={s.matchText}>out of 100 style match</span>
          </p>
          {shared.length > 0 || gaps.length > 0 ? (
            <dl className={s.edges}>
              {shared.length > 0 ? (
                <div className={s.edgeLine}>
                  <dt className="t-eyebrow">Both</dt>
                  <dd>{shared.map((d) => d.text).join(' · ')}</dd>
                </div>
              ) : null}
              {gaps.length > 0 ? (
                <div className={s.edgeLine}>
                  <dt className="t-eyebrow">Biggest gaps</dt>
                  <dd>
                    {gaps
                      .map((g) => `${CATALOG[g.stat].label.toLowerCase()} (${formatStat(g.stat, a.s[g.stat])} vs. ${formatStat(g.stat, b.s[g.stat])})`)
                      .join('; ')}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      }
      howTo={howTo}>
      {view === 'table' ? (
        <div className={s.tableScroll} tabIndex={0} role="region" aria-label="Style table">
          <table className={s.table}>
            <caption className="visually-hidden">
              {a.name} and {b.name}: style stats against the average qualified player
            </caption>
            <thead>
              <tr>
                <th scope="col">Stat</th>
                <th scope="col" className={s.right}>
                  {sa}
                </th>
                <th scope="col" className={s.right}>
                  {sb}
                </th>
              </tr>
            </thead>
            <tbody>
              {STYLE_STATS.map((stat, i) => (
                <tr key={stat}>
                  <th scope="row">{CATALOG[stat].label}</th>
                  <td className={`num ${s.right}`}>
                    {formatStat(stat, a.s[stat])}
                    <span className={`t-caption ${s.cellNote}`}>{zText(va[i])}</span>
                  </td>
                  <td className={`num ${s.right}`}>
                    {formatStat(stat, b.s[stat])}
                    <span className={`t-caption ${s.cellNote}`}>{zText(vb[i])}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <Legend a={a} b={b} note="Against the average · not better or worse" />
          <DumbbellChart
            layout="stacked"
            groups={[{ rows }]}
            ticks={[
              { at: 0, label: 'Less' },
              { at: 50, label: 'Average' },
              { at: 100, label: 'More' },
            ]}
            summary={`${a.name} and ${b.name}: ten style stats against the average qualified player. Style match ${match} out of 100.`}
          />
        </>
      )}
    </ChartFrame>
  );
}
