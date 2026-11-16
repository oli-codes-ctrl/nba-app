/**
 * What each share preview shows. Served as PNG files by app/og/[kind]/[file]/route.ts:
 * /og/pages/<key>.png, /og/players/<slug>.png, /og/teams/<abbr>.png, /og/stats/<stat>.png.
 */
import type { ReactNode } from 'react';

import { signed } from '@/components/teams/answers';
import type { Player } from '@/data/types';
import { formatStat, ordinal } from '@/lib/format';
import { statQuestion } from '@/lib/meta';
import { SITE } from '@/lib/site';
import { cardRows } from '@/players/card';
import { loadData } from '@/server/data';
import { CATALOG, type StatId } from '@/stats/catalog';
import { groupNoun, positionGroup, positionName } from '@/stats/views';
import { netVerdict } from '@/teams/analysis';
import { teamInfo } from '@/theme/teams';

import { Frame, Ring, tok } from './card';

/** Pages whose preview is their question: the eyebrow names the section, the title is the page's h1. */
export const PAGE_CARDS = {
  site: { eyebrow: 'Pro basketball stats, explained', title: SITE.tagline },
  players: { eyebrow: 'Players', title: 'Every player, ranked.' },
  teams: { eyebrow: 'Teams', title: 'Every team, rated.' },
  compare: { eyebrow: 'Compare', title: 'Who’s better?' },
  explore: { eyebrow: 'Explore', title: 'Any two stats, every player.' },
  games: { eyebrow: 'Games', title: 'Play the numbers.' },
  daily: { eyebrow: 'Daily Guess', title: 'Who’s the mystery player?' },
  'higher-lower': { eyebrow: 'Higher or Lower', title: 'Higher or lower?' },
  'box-score': { eyebrow: 'Box Score Mystery', title: 'Whose line is it?' },
  trophies: { eyebrow: 'Trophies', title: 'Which trophies have you earned?' },
  glossary: { eyebrow: 'Glossary', title: 'What does each stat mean?' },
  about: { eyebrow: 'About the data', title: 'Where do these numbers come from?' },
} as const;

export type PageCard = keyof typeof PAGE_CARDS;

function Pill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'flex',
        fontSize: 26,
        color: tok('ink-muted'),
        background: tok('surface-2'),
        border: `1px solid ${tok('hairline')}`,
        borderRadius: 9999,
        padding: '10px 22px',
      }}>
      {children}
    </span>
  );
}

/** A labeled number, as the site's stat tiles. */
function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flex: 1,
        padding: '22px 26px',
        background: tok('surface-1'),
        border: `1px solid ${tok('hairline')}`,
        borderRadius: 16,
      }}>
      <span style={{ fontSize: 22, color: tok('ink-subtle') }}>{label}</span>
      <span style={{ fontFamily: 'Archivo Score', fontSize: 58, fontWeight: 800, lineHeight: 1 }}>{value}</span>
      {note ? <span style={{ fontSize: 22, color: tok('ink-subtle') }}>{note}</span> : null}
    </div>
  );
}

export function pageImage(key: PageCard) {
  const data = loadData();
  const card = PAGE_CARDS[key];
  const facts =
    key === 'site'
      ? [`${data.manifest.qualifiedCount} players ranked`, `${data.teams.teams.length} teams rated`, 'Three stat games']
      : null;
  return (
    <Frame eyebrow={card.eyebrow} title={card.title} through={data.through} titleSize={key === 'site' ? 104 : 92}>
      {facts ? (
        <div style={{ display: 'flex', gap: 16 }}>
          {facts.map((f) => (
            <Pill key={f}>{f}</Pill>
          ))}
        </div>
      ) : null}
    </Frame>
  );
}

/** The five rings on a player's preview: overall, scoring, efficiency, passing, boards. */
const RINGS = ['game_score', 'pts', 'ts_pct', 'ast_pct', 'reb_pct'] as const;

export function playerImage(player: Player) {
  const data = loadData();
  // Same pool the player page opens on: his position when it has ranks, else all players.
  const group = positionGroup(player.pos);
  const byPosition = player.q && group != null && player.pctPos != null;
  const rows = cardRows(player, data.players.players, byPosition ? group : null);
  const pick = RINGS.map((stat) => rows.find((r) => r.stat === stat)!);
  const pool = byPosition ? `Percentile among qualified ${groupNoun(group!)}` : 'Percentile among qualified players';
  return (
    <Frame
      eyebrow={`${teamInfo(player.team).name} ${positionName(player.pos).toLowerCase()}`}
      title={player.name}
      through={data.through}
      team={teamInfo(player.team).color}
      titleSize={player.name.length > 20 ? 92 : 112}>
      {player.q ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
          <span style={{ fontSize: 22, color: tok('ink-subtle') }}>{pool}</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {pick.map((r) => (
              <Ring key={r.stat} better={r.better} label={r.label.replace(/ /g, ' ')} value={formatStat(r.stat, r.value)} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
          <span style={{ fontSize: 22, color: tok('ink-subtle') }}>Per game · not ranked yet: too few games or minutes</span>
          <div style={{ display: 'flex', gap: 16, width: '100%' }}>
            {([['pts', 'Points'], ['reb', 'Rebounds'], ['ast', 'Assists'], ['mpg', 'Minutes']] as const).map(([id, label]) => (
              <Tile key={id} label={label} value={formatStat(id, player.s[id])} />
            ))}
          </div>
        </div>
      )}
    </Frame>
  );
}

export function teamImage(abbr: string) {
  const data = loadData();
  const doc = data.teams;
  const t = doc.teams.find((x) => x.abbr === abbr);
  const name = teamInfo(abbr).name;
  const n = doc.teams.length;
  const rank = (id: 'net' | 'ortg' | 'drtg') => (t?.rank[id] ? `${ordinal(t.rank[id]!)} of ${n}` : undefined);
  const verdict = t ? netVerdict(t) : null;
  const answer =
    verdict === 'above'
      ? 'Yes: better than average, even allowing for luck'
      : verdict === 'below'
        ? 'Not yet: worse than average, even allowing for luck'
        : verdict === 'unclear'
          ? 'Too early to tell: within luck of an average team'
          : 'Net rating per 100 possessions';
  return (
    <Frame eyebrow={answer} title={`Is ${name} for real?`} through={doc.gamesThrough} team={teamInfo(abbr).color} titleSize={name.length > 14 ? 84 : 100}>
      <div style={{ display: 'flex', gap: 16, width: '100%' }}>
        <Tile label="Record" value={t && t.w != null && t.l != null ? `${t.w}–${t.l}` : '–'} />
        <Tile label="Net rating" value={t?.net != null ? signed(t.net) : '–'} note={rank('net')} />
        <Tile label="Offense" value={t?.ortg != null ? t.ortg.toFixed(1) : '–'} note={rank('ortg')} />
        <Tile label="Defense" value={t?.drtg != null ? t.drtg.toFixed(1) : '–'} note={rank('drtg')} />
      </div>
    </Frame>
  );
}

export function statImage(stat: StatId) {
  const data = loadData();
  const def = CATALOG[stat];
  const ranked = data.players.players.filter((p) => p.pct?.[stat] != null && p.s[stat] != null);
  const top = ranked
    .sort((a, b) => (def.lowerIsBetter ? a.s[stat]! - b.s[stat]! : b.s[stat]! - a.s[stat]!) || a.id - b.id)
    .slice(0, 3);
  const question = statQuestion(stat);
  return (
    <Frame
      eyebrow={`${ranked.length} qualified players ranked`}
      title={question}
      through={data.through}
      titleSize={question.length > 40 ? 64 : 80}>
      <div style={{ display: 'flex', gap: 16, width: '100%' }}>
        {top.map((p, i) => (
          <Tile key={p.id} label={`${ordinal(i + 1)} · ${p.team}`} value={formatStat(stat, p.s[stat])} note={p.name} />
        ))}
      </div>
    </Frame>
  );
}
