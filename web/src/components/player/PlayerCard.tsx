import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { CourtLines } from '@/components/CourtLines';
import { percentileColor, StatTiles, TeamChip, type Tile } from '@/components/primitives';
import type { Player } from '@/data/types';
import { betterPct, formatStat, ordinal } from '@/lib/format';
import { statPath, teamPath, type Pool } from '@/lib/routes';
import type { CardInsights, CardRow } from '@/players/card';
import { positionName } from '@/stats/views';
import { teamInfo } from '@/theme/teams';

import c from './card.module.css';
import { PoolSwitch, PoolView, type PoolChoice } from './pool';

/** The rings on the card: overall, scoring, efficiency, passing, boards (the share image shows the same five). */
export const CARD_RINGS = ['game_score', 'pts', 'ts_pct', 'ast_pct', 'reb_pct'] as const;

export type CardPool = {
  pool: PoolChoice;
  /** Who the ranks are among: "centers" or "players". */
  noun: string;
  /** The route pool for links to stat pages. */
  route: Pool;
  rows: readonly CardRow[];
  insights: CardInsights;
};

type Props = {
  player: Player;
  /** One entry per pool the reader can switch between; empty when he is not qualified. */
  pools: readonly CardPool[];
  /** "Centers": names his position pool for the switch; null when only all players apply. */
  groupLabel: string | null;
  tiles: readonly Tile[];
  actions: ReactNode;
};

/**
 * The player's card: the page's answer and its signature. A field in his
 * team's color with the court drawn faintly in it, his name set large, the
 * facts as label-value pairs, the verdict in one sentence and five rings
 * that sweep in once; his season numbers sit along the bottom edge.
 */
export function PlayerCard({ player, pools, groupLabel, tiles, actions }: Props) {
  const team = teamInfo(player.team);
  const earlier = player.teams.slice(1);
  return (
    <section className={c.card} style={{ '--team': team.color } as CSSProperties} aria-labelledby="player-name">
      <div className={c.field}>
        <CourtLines className={c.court} />
        <div className={c.identity}>
          <h1 id="player-name" className={`t-display-lg ${c.name}`}>
            {player.name}
          </h1>
          <dl className={c.facts}>
            <div className={c.fact}>
              <dt>Team</dt>
              <dd className={c.teamFact}>
                <TeamChip abbr={player.team} />
                <Link href={teamPath(player.team)} className="link">
                  {team.name}
                </Link>
              </dd>
            </div>
            <div className={c.fact}>
              <dt>Position</dt>
              <dd>{positionName(player.pos)}</dd>
            </div>
            {player.s.age != null ? (
              <div className={c.fact}>
                <dt>Age</dt>
                <dd className="num">{player.s.age}</dd>
              </div>
            ) : null}
            <div className={c.fact}>
              <dt>Games</dt>
              <dd className="num">{player.s.gp ?? 0}</dd>
            </div>
            {earlier.length > 0 ? (
              <div className={c.fact}>
                <dt>Earlier this season</dt>
                <dd className={c.teamFact}>
                  {earlier.map((t) => (
                    <TeamChip key={t} abbr={t} link muted />
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
          {pools.length ? (
            pools.map((p) => (
              <PoolView key={p.pool} pool={p.pool}>
                <p className={c.verdict}>{verdict(p.insights)}</p>
              </PoolView>
            ))
          ) : (
            <p className={c.verdict}>Not ranked yet: he needs more games or minutes to be compared fairly.</p>
          )}
          <div className={c.actions}>{actions}</div>
        </div>

        {pools.length ? (
          <div className={c.ringsArea}>
            <div className={c.ringsHead}>
              <p className={c.ringsLabel}>Percentile among</p>
              {groupLabel ? <PoolSwitch groupLabel={groupLabel} /> : <p className={c.ringsLabel}>all qualified players</p>}
            </div>
            {pools.map((p) => (
              <PoolView key={p.pool} pool={p.pool}>
                <ol className={c.rings}>
                  {CARD_RINGS.map((stat, i) => {
                    const row = p.rows.find((r) => r.stat === stat);
                    return row ? <Ring key={stat} row={row} index={i} noun={p.noun} href={statPath(stat, { player: player.id, pos: p.route })} /> : null;
                  })}
                </ol>
              </PoolView>
            ))}
          </div>
        ) : null}
      </div>

      <StatTiles tiles={tiles} label={`${player.name} season averages, with his rank among qualified players`} className={c.tiles} />
    </section>
  );
}

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A percentile ring: its arc sweeps to his percentile once, on load. The number keeps the 0-100 scale. */
function Ring({ row, index, noun, href }: { row: CardRow; index: number; noun: string; href: string }) {
  // The card's labels keep their no-break space, so "%" never wraps alone.
  const label = row.label;
  const better = row.better;
  const spoken =
    `${label}: ${formatStat(row.stat, row.value)}, ` +
    (better == null ? 'not ranked yet' : `better than ${betterPct(better)}% of ${noun}`);
  return (
    <li className={c.ring} style={{ '--i': index } as CSSProperties}>
      <Link href={href} className={c.ringLink} prefetch={false} aria-label={spoken}>
        <span className={c.dial} aria-hidden="true">
          <svg viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={RADIUS} className={c.track} />
            {better != null ? (
              <circle
                cx="32"
                cy="32"
                r={RADIUS}
                className={c.arc}
                strokeDasharray={CIRCUMFERENCE}
                style={
                  {
                    stroke: percentileColor(better),
                    '--len': CIRCUMFERENCE,
                    '--to': CIRCUMFERENCE * (1 - Math.max(0.02, better / 100)),
                  } as CSSProperties
                }
              />
            ) : null}
          </svg>
          <span className={`t-score ${c.dialNumber}`}>{better == null ? '–' : Math.round(better)}</span>
        </span>
        <span className={c.ringLabel} aria-hidden="true">
          {label}
        </span>
        <span className={`num ${c.ringValue}`} aria-hidden="true">
          {formatStat(row.stat, row.value)}
        </span>
      </Link>
    </li>
  );
}

/** "Game Score" keeps its capitals; the rest read as words in a sentence. */
function inSentence(label: string): string {
  return label.startsWith('Game Score') ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

function list(items: readonly string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * The card's answer in words, claiming only what the ranges support
 * (players/card.ts): elite and weak need the whole range on one side.
 */
export function verdict({ elite, weak, unsettled }: CardInsights): string {
  const sentences: string[] = [];
  if (elite.length) sentences.push(`Elite at ${list(elite.slice(0, 4).map((r) => inSentence(r.label)))}.`);
  if (weak.length) {
    sentences.push(`${weak.length > 1 ? 'Weak spots' : 'Weak spot'}: ${list(weak.slice(0, 3).map((r) => inSentence(r.label)))}.`);
  }
  if (!elite.length && !weak.length) sentences.push('Nothing is clearly elite or weak yet, allowing for luck.');
  if (unsettled.length) {
    const named = list(unsettled.slice(0, 3).map((r) => `${inSentence(r.label)} (${ordinal(Math.round(r.better ?? 0))})`));
    sentences.push(`${named.charAt(0).toUpperCase()}${named.slice(1)} ${unsettled.length > 1 ? 'are' : 'is'} not settled yet.`);
  }
  return sentences.join(' ');
}
