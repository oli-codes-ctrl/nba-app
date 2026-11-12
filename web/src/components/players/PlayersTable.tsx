'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { ArrowDownIcon, ArrowUpIcon, SearchIcon } from '@/components/icons';
import { Avatar, EmptyState, TeamChip } from '@/components/primitives';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { Player } from '@/data/types';
import { fold } from '@/lib/fold';
import { formatStat } from '@/lib/format';
import { playerPath } from '@/lib/routes';
import { useQuery } from '@/lib/useQueryParam';
import { queryPlayers } from '@/players/query';
import { CATALOG, type StatId } from '@/stats/catalog';
import { attemptsShort, attemptsText, hasSample, sampleFor, type AttemptRules } from '@/stats/samples';
import { groupNoun, normalized, POSITION_GROUPS, type Normalization, type PositionGroup } from '@/stats/views';

import s from './players.module.css';
import { COLUMNS, DEFAULT_SORT, SORTABLE, unpackPlayer, type PackedPlayer } from './tableData';

const PAGE_SIZE = 50;

type PositionFilter = PositionGroup | 'all';
const POSITIONS: readonly { id: PositionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...POSITION_GROUPS.map((g) => ({ id: g, label: groupNoun(g).replace(/^./, (c) => c.toUpperCase()) })),
];
/** URL values for the scale: short and readable in a shared link. */
const SCALES: readonly { id: Normalization; param: string | null; label: string; words: string }[] = [
  { id: 'game', param: null, label: 'Per Game', words: 'per game' },
  { id: 'per36', param: '36', label: 'Per 36 Min', words: 'per 36 minutes' },
  { id: 'per100', param: '100', label: 'Per 100 Poss.', words: 'per 100 possessions' },
];

type Props = {
  rows: readonly PackedPlayer[];
  rules: AttemptRules | undefined;
  /** "Nov 10, 2026" */
  through: string;
};

/**
 * Every player in one sortable table. Sort, scale, position, the qualified
 * filter, the name filter and the page all live in the query string, so any
 * view can be shared as a link.
 */
export function PlayersTable({ rows, rules, through }: Props) {
  const players = useMemo(() => rows.map(unpackPlayer), [rows]);
  const [query, update] = useQuery();
  const top = useRef<HTMLDivElement>(null);

  // View state, read from the URL with safe defaults.
  const sortParam = query.get('sort');
  const sort: StatId = sortParam && (SORTABLE as readonly string[]).includes(sortParam) ? (sortParam as StatId) : DEFAULT_SORT;
  const reversed = query.get('order') === 'reverse';
  const scale = SCALES.find((x) => x.param === query.get('per')) ?? SCALES[0];
  const posParam = query.get('pos');
  const position: PositionFilter = posParam === 'G' || posParam === 'F' || posParam === 'C' ? posParam : 'all';
  const qualifiedOnly = query.get('show') !== 'all';
  const search = query.get('q') ?? '';
  const column = COLUMNS.find((c) => c.stat === sort)!;
  // The stat actually sorted: PTS becomes PTS/36 or PTS/100 when scaled.
  const view = column.scalable ? normalized(sort, scale.id) : sort;

  // The name field keeps its own text and writes the URL after a pause, so typing never floods the history API.
  const [text, setText] = useState(search);
  useEffect(() => setText(search), [search]);
  useEffect(() => {
    if (text === search) return;
    const timer = window.setTimeout(() => update({ q: text.trim() ? text : null, page: null }), 250);
    return () => window.clearTimeout(timer);
  }, [text, search, update]);

  const { list, ranks, total } = useMemo(() => {
    const options = { sort: view, qualifiedOnly, rules, position: position === 'all' ? null : position };
    const order = (found: Player[]): Player[] => {
      if (!reversed) return found;
      // Reverse the ranked players only: those without a value or enough attempts stay last.
      const ranked = found.filter((p) => p.s[view] != null && hasSample(p, view, rules));
      return [...ranked.reverse(), ...found.filter((p) => !ranked.includes(p))];
    };
    // Ranks come from the list without the name filter, so finding a player by name shows his real rank.
    const base = queryPlayers([...players], { ...options, search: '' });
    const rankById = new Map<number, number>();
    base.forEach((p, i) => {
      if (p.s[view] != null && hasSample(p, view, rules)) rankById.set(p.id, i + 1);
    });
    const needle = fold(text);
    const found = needle ? queryPlayers([...players], { ...options, search: text }) : base;
    return { list: order(needle ? found : [...base]), ranks: rankById, total: base.length };
  }, [players, view, qualifiedOnly, rules, position, reversed, text]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(query.get('page')) || 1));
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const searching = fold(text) !== '';
  const rule = rules?.[view];
  const def = CATALOG[view];
  const bestFirst = def.lowerIsBetter ? 'fewest first' : 'highest first';
  const worstFirst = def.lowerIsBetter ? 'most first' : 'lowest first';

  function sortBy(stat: StatId) {
    if (stat === sort) update({ order: reversed ? null : 'reverse', page: null });
    else update({ sort: stat === DEFAULT_SORT ? null : stat, order: null, page: null });
  }

  function goTo(next: number) {
    update({ page: next <= 1 ? null : String(next) });
    top.current?.scrollIntoView({ block: 'start' });
  }

  function ariaSort(stat: StatId): 'ascending' | 'descending' | undefined {
    if (stat !== sort) return undefined;
    return def.lowerIsBetter !== reversed ? 'ascending' : 'descending';
  }

  return (
    <div className={s.block} ref={top}>
      <div className={s.toolbar}>
        <label className={s.filter}>
          <span className="visually-hidden">Filter players by name</span>
          <SearchIcon />
          <input
            className={s.filterInput}
            type="text"
            name="player-filter"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Filter by name…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <SegmentedControl
          label="Position"
          options={POSITIONS}
          value={position}
          onChange={(id) => update({ pos: id === 'all' ? null : id, page: null })}
        />
        <SegmentedControl
          label="Scale counting stats"
          options={SCALES.map((x) => ({ id: x.id, label: x.label }))}
          value={scale.id}
          onChange={(id) => update({ per: SCALES.find((x) => x.id === id)?.param ?? null, page: null })}
        />
        <button
          type="button"
          role="switch"
          aria-checked={qualifiedOnly}
          className={s.switch}
          onClick={() => update({ show: qualifiedOnly ? 'all' : null, page: null })}>
          <span className={s.switchTrack} aria-hidden="true">
            <span className={s.switchThumb} />
          </span>
          Qualified Only
        </button>
      </div>

      <p className={`t-caption num ${s.meta}`} role="status" aria-live="polite">
        {searching
          ? `${list.length} ${list.length === 1 ? 'player matches' : 'players match'} “${text.trim()}” (a name search covers every player)`
          : `${total} ${qualifiedOnly ? 'qualified ' : ''}${position === 'all' ? 'players' : groupNoun(position)}`}{' '}
        · sorted by {def.label.toLowerCase()}, {reversed ? worstFirst : bestFirst} · games through {through}
        {qualifiedOnly && !searching
          ? ` · qualified: at least 10 minutes a game and enough games played${
              rule ? `; ${def.short} also needs ${attemptsText(rule.min, rule.by)}` : ''
            }`
          : ''}
      </p>

      {list.length === 0 ? (
        <EmptyState
          title={searching ? `No player matches “${text.trim()}”.` : 'No players match these filters.'}
          actions={
            <Button onClick={() => (searching ? setText('') : update({ pos: null, show: null, page: null }))}>
              {searching ? 'Clear the Name Filter' : 'Reset Filters'}
            </Button>
          }>
          {searching ? 'Check the spelling, or try a last name only.' : 'Widen the position or turn off Qualified Only.'}
        </EmptyState>
      ) : (
        <div className={s.scroll}>
          <table className={s.table}>
            <caption className="visually-hidden">
              Players sorted by {def.label}, {reversed ? worstFirst : bestFirst}. Counting stats are {scale.words}.
            </caption>
            <thead>
              <tr>
                <th scope="col" className={s.rankCol}>
                  <abbr title="Rank in this list">#</abbr>
                </th>
                <th scope="col" className={s.playerCol}>
                  Player
                </th>
                {COLUMNS.map((c) => {
                  const id = c.scalable ? normalized(c.stat, scale.id) : c.stat;
                  const active = c.stat === sort;
                  const up = active && ariaSort(c.stat) === 'ascending';
                  return (
                    <th key={c.stat} scope="col" aria-sort={ariaSort(c.stat)} className={active ? s.activeCol : undefined}>
                      <button type="button" className={s.sortButton} title={`Sort by ${CATALOG[id].label}`} onClick={() => sortBy(c.stat)}>
                        <span aria-hidden="true">{CATALOG[id].short}</span>
                        <span className="visually-hidden">{CATALOG[id].label}</span>
                        {active ? up ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} /> : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <Row key={p.id} player={p} rank={ranks.get(p.id)} sort={sort} view={view} scale={scale.id} rules={rules} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.length > PAGE_SIZE ? (
        <nav className={s.pager} aria-label="Pages">
          <p className="t-body-sm t-subtle num">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, list.length)} of {list.length}
          </p>
          <div className={s.pagerButtons}>
            <Button disabled={page <= 1} onClick={() => goTo(page - 1)}>
              Previous {PAGE_SIZE}
            </Button>
            <Button disabled={page >= pages} onClick={() => goTo(page + 1)}>
              Next {PAGE_SIZE}
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function Row({
  player,
  rank,
  sort,
  view,
  scale,
  rules,
}: {
  player: Player;
  rank: number | undefined;
  sort: StatId;
  view: StatId;
  scale: Normalization;
  rules: AttemptRules | undefined;
}) {
  // Sorted by a shooting percentage: show the attempts behind it.
  const sample = sampleFor(player, view, rules);
  return (
    <tr>
      <td className={`num ${s.rankCol}`}>{rank ?? '–'}</td>
      <th scope="row" className={s.playerCol}>
        <Link href={playerPath(player)} className={s.player} prefetch={false}>
          <Avatar name={player.name} size={28} />
          <span className={s.playerText}>
            <span className={s.playerName}>{player.name}</span>
            <span className={s.playerMeta}>
              <TeamChip abbr={player.team} />
              <span className={`t-caption ${s.pos}`}>{player.pos}</span>
            </span>
          </span>
        </Link>
      </th>
      {COLUMNS.map((c) => {
        const id = c.scalable ? normalized(c.stat, scale) : c.stat;
        const active = c.stat === sort;
        // A percentage on too few attempts is shown, but quieter: it is not ranked.
        const thin = !hasSample(player, id, rules);
        return (
          <td key={c.stat} className={`num ${active ? s.activeCol : ''} ${thin ? s.thin : ''}`}>
            {formatStat(id, player.s[id])}
            {active && sample ? (
              <span className={`t-caption ${s.sample}`}>
                {attemptsShort(sample.have, sample.by)}
                {sample.enough ? '' : ' · too few to rank'}
              </span>
            ) : null}
          </td>
        );
      })}
    </tr>
  );
}
