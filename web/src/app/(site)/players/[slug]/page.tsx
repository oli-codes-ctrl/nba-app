import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ButtonLink } from '@/components/Button';
import { ChartFrame } from '@/components/ChartFrame';
import { CompareIcon } from '@/components/icons';
import { FollowButton } from '@/components/player/FollowButton';
import { GameTrend } from '@/components/player/GameTrend';
import { PercentileCard } from '@/components/player/PercentileCard';
import { PlayerCard, type CardPool } from '@/components/player/PlayerCard';
import s from '@/components/player/player.module.css';
import { PoolProvider, PoolView } from '@/components/player/pool';
import { StatGroups } from '@/components/player/StatGroups';
import { StatsMore } from '@/components/player/StatsMore';
import { KeyStats, StatTables } from '@/components/player/StatTables';
import { Avatar, TeamChip, type Tile } from '@/components/primitives';
import { SectionNav, type Section } from '@/components/SectionNav';
import type { Player } from '@/data/types';
import { playerLog } from '@/games/logs';
import { shortName } from '@/graphs/analysis';
import { betterPct, formatDate, formatStat, ordinal, rankText, seasonLabel } from '@/lib/format';
import { ogImage, pageMeta } from '@/lib/meta';
import { comparePath, idFromSlug, playerPath, playerSlug, statPath } from '@/lib/routes';
import { cardInsights, cardRows, type CardRow } from '@/players/card';
import { comps } from '@/players/similar';
import { loadData, type SiteData } from '@/server/data';
import { CATALOG, GROUPS, statsInGroup, type StatId } from '@/stats/catalog';
import { groupNoun, positionGroup, positionName, type PositionGroup } from '@/stats/views';
import { teamInfo } from '@/theme/teams';

/** Below this many team games, the page warns that ranks are volatile. */
const EARLY_SEASON_GAMES = 20;
const TILE_STATS: readonly StatId[] = ['pts', 'reb', 'ast', 'ts_pct', 'game_score', 'mpg'];
const RECENT_STATS: readonly StatId[] = ['pts', 'reb', 'ast', 'fg3m', 'ts_pct'];
/** Every stat the full tables list. */
const TOTAL_STATS = GROUPS.reduce((n, g) => n + statsInGroup(g.id).length, 0);

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return loadData().players.players.map((p) => ({ slug: playerSlug(p) }));
}

function findPlayer(data: SiteData, slug: string): Player | undefined {
  const id = idFromSlug(slug);
  const player = id == null ? undefined : data.playerById.get(id);
  // One canonical URL per player: the slug must match exactly.
  return player && playerSlug(player) === slug ? player : undefined;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = loadData();
  const player = findPlayer(data, slug);
  if (!player) return {};
  const team = teamInfo(player.team).name;
  const line = (['pts', 'reb', 'ast'] as const).map((id) => `${formatStat(id, player.s[id])} ${CATALOG[id].short}`).join(', ');
  const title = `${player.name} Stats, Percentiles and Game Log`;
  const description =
    `${player.name} (${team}, ${positionName(player.pos).toLowerCase()}) in ${seasonLabel(data.manifest.season)}: ${line}` +
    (player.s.ts_pct != null ? ` on ${formatStat('ts_pct', player.s.ts_pct)} true shooting` : '') +
    `. Where he ranks, how sure we can be, and who plays like him. Games through ${formatDate(data.through)}.`;
  return pageMeta({
    title,
    description,
    path: playerPath(player),
    share: `${player.name}: How Good Is He, Really?`,
    image: ogImage.player(slug),
    imageAlt: player.q
      ? `${player.name}'s percentile rings for Game Score, points, true shooting, assist rate and rebound rate.`
      : `${player.name}'s points, rebounds, assists and minutes per game.`,
    type: 'profile',
  });
}

export default async function PlayerPage({ params }: Params) {
  const { slug } = await params;
  const data = loadData();
  const player = findPlayer(data, slug);
  if (!player) notFound();

  const all = data.players.players;
  const rules = data.players.minAttempts;
  const through = formatDate(data.through);
  const group = positionGroup(player.pos);
  const hasPositionRanks = player.q && group != null && player.pctPos != null;
  const groupLabel = hasPositionRanks ? capital(groupNoun(group!)) : null;
  const short = shortName(player.name);
  const earlierTeams = player.teams.slice(1);
  const similar = comps(player, all, rules, 3, data.vectors);
  const log = data.games ? playerLog(data.games, player.id) : [];
  const boxThrough = data.games ? formatDate(data.games.boxScoresThrough ?? data.games.gamesThrough) : through;

  const tiles: Tile[] = TILE_STATS.map((id) => {
    const rank = player.rank?.[id];
    const size = data.players.poolSize[id];
    return {
      label: CATALOG[id].short,
      title: CATALOG[id].label,
      value: formatStat(id, player.s[id]),
      note: rank != null && size ? rankText(id, rank, size) : undefined,
      href: statPath(id, { player: player.id }),
    };
  });

  const pools: { pool: 'pos' | 'all'; group: PositionGroup | null }[] = hasPositionRanks
    ? [
        { pool: 'pos', group },
        { pool: 'all', group: null },
      ]
    : [{ pool: 'all', group: null }];

  const ranksFor = (g: PositionGroup | null) =>
    g
      ? { pct: player.pctPos, rank: player.rankPos, size: data.players.poolSizePos?.[g] ?? {} }
      : { pct: player.pct, rank: player.rank, size: data.players.poolSize };
  const cardPools: CardPool[] = player.q
    ? pools.map(({ pool, group: g }) => {
        const rows = cardRows(player, all, g);
        return { pool, noun: g ? groupNoun(g) : 'players', route: g ?? 'all', rows, insights: cardInsights(rows) };
      })
    : [];
  const note = !player.q
    ? null
    : data.mostGames > 0 && data.mostGames < EARLY_SEASON_GAMES
      ? `Early season: teams have played about ${data.mostGames} games, so ranks can still swing from night to night. Games through ${through}.`
      : `Games through ${through}.`;
  const sections: Section[] = [
    ...(player.q ? [{ id: 'ranks', label: 'Ranks' }] : []),
    ...(log.length > 0 ? [{ id: 'trend', label: 'Form' }] : data.players.latest || data.players.recent ? [{ id: 'form', label: 'Form' }] : []),
    ...(similar.length > 0 ? [{ id: 'comps', label: 'Plays Like' }] : []),
    { id: 'every', label: 'Numbers' },
  ];

  return (
    <div className={`wrap ${s.page}`}>
      <nav aria-label="Breadcrumb" className={`t-caption ${s.crumbs}`}>
        <Link href="/players" className={s.crumb}>
          Players
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{player.name}</span>
      </nav>

      <PoolProvider groupLabel={groupLabel}>
        <div className={s.lead}>
          <PlayerCard
            player={player}
            pools={cardPools}
            groupLabel={groupLabel}
            tiles={tiles}
            actions={
              <>
                <ButtonLink variant="primary" href={comparePath(player.id)} icon={<CompareIcon />}>
                  Compare
                </ButtonLink>
                <FollowButton id={player.id} name={player.name} />
              </>
            }
          />
          {note ? <p className={`t-caption t-subtle num ${s.leadNote}`}>{note}</p> : null}
        </div>

        <SectionNav sections={sections} label={`${player.name}: sections`} />

        <div className={s.grid}>
          {cardPools.map((p) => (
            <PoolView key={p.pool} pool={p.pool}>
              <PercentileCard
                id="ranks"
                title="Where does he rank in each stat?"
                poolText={`${(p.route === 'all' ? data.players.poolSize : data.players.poolSizePos?.[p.route] ?? {}).pts ?? 0} qualified ${p.noun}`}
                through=""
                rows={p.rows}
                insights={p.insights}
                playerId={player.id}
                pool={p.route}
                answer={rankSummary(p.rows)}
              />
            </PoolView>
          ))}

          <div className={s.side}>
            {log.length > 0 ? (
              <GameTrend log={log} name={short} through={boxThrough} />
            ) : (
              <RecentForm player={player} data={data} />
            )}

            {similar.length > 0 ? (
              <ChartFrame
                id="comps"
                title="Who’s he like?"
                meta="Closest styles this season; 100 means the same style"
                howTo={
                  <>
                    <p>
                      Style, not quality: usage, shot diet, efficiency, passing, boards and defense, each compared
                      with the league average. A role player can match a star of the same type.
                    </p>
                    <p>
                      The match is the cosine similarity of the two profiles, times 100. “Both” lists the stats where
                      the two players sit clearly on the same side of average.
                    </p>
                  </>
                }>
                <ol className={s.comps}>
                  {similar.map(({ player: other, match, drivers }) => (
                    <li key={other.id}>
                      <Link href={playerPath(other)} className={s.comp}>
                        <Avatar name={other.name} size={36} />
                        <span className={s.compText}>
                          <span className={s.compName}>
                            {other.name} <TeamChip abbr={other.team} />
                          </span>
                          {drivers.length > 0 ? (
                            <span className={`t-caption ${s.compWhy}`}>Both: {list(drivers.map((d) => d.text))}</span>
                          ) : null}
                        </span>
                        <span className={s.compMatch}>
                          <span className={`t-score ${s.compScore}`}>{Math.round(100 * match)}</span>
                          <span className="t-caption t-subtle">match</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </ChartFrame>
            ) : null}
          </div>
        </div>

        <section id="every" className={s.every} aria-labelledby="every-title">
          <header className={s.everyHead}>
            <h2 id="every-title" className="t-card-title">
              What are his numbers?
            </h2>
            {player.q ? null : <p className="t-body-sm t-subtle">Ranks appear once he has enough games and minutes.</p>}
          </header>
          <StatsMore
            total={TOTAL_STATS}
            short={pools.map(({ pool, group: g }) => (
              <PoolView key={pool} pool={pool}>
                <KeyStats player={player} ranks={ranksFor(g)} noun={g ? groupNoun(g) : 'players'} pool={g ?? 'all'} rules={rules} />
              </PoolView>
            ))}
            full={
              <StatGroups>
                {pools.map(({ pool, group: g }) => (
                  <PoolView key={pool} pool={pool}>
                    <StatTables
                      player={player}
                      ranks={ranksFor(g)}
                      noun={g ? groupNoun(g) : 'players'}
                      pool={g ?? 'all'}
                      rules={rules}
                      method={
                      (g
                        ? `Percentiles compare him with the ${data.players.poolSizePos?.[g]?.pts ?? 0} qualified ${groupNoun(g)}.`
                        : `Percentiles compare against the ${data.manifest.qualifiedCount} qualified players.`) +
                      ' Shooting percentages rank only players with enough attempts. “Skill” is where his long-run percentage probably falls (95% range); a skill estimate also weighs how the league’s shooters usually do, so a hot or cold start counts for less. For turnovers and fouls, fewer counts as better.'
                      }
                    />
                  </PoolView>
                ))}
              </StatGroups>
            }
          />
        </section>
      </PoolProvider>
    </div>
  );
}

/** The ranks panel's answer: his highest and lowest percentile among the stats that have a better end. */
function rankSummary(rows: readonly CardRow[]): string | undefined {
  const judged = rows.filter((r): r is CardRow & { better: number } => !r.neutral && r.better != null);
  if (!judged.length) return undefined;
  const best = judged.reduce((x, y) => (y.better > x.better ? y : x));
  const low = judged.reduce((x, y) => (y.better < x.better ? y : x));
  const at = (r: CardRow & { better: number }) => `${inSentence(r.label)} (${ordinal(betterPct(r.better))} percentile)`;
  return best === low ? `Ranked in one stat: ${at(best)}.` : `Highest in ${at(best)}; lowest in ${at(low)}. The lighter stretch on each bar is where luck could still put him.`;
}

function inSentence(label: string): string {
  return label.startsWith('Game Score') ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

function list(items: readonly string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function capital(text: string): string {
  return text.replace(/^./, (c) => c.toUpperCase());
}

/** Shown only when no box scores are published: the latest game and recent averages from nightly totals. */
function RecentForm({ player, data }: { player: Player; data: SiteData }) {
  const { latest, recent } = data.players;
  const g = latest ? player.g : undefined;
  const r = recent ? player.r : undefined;
  if (!g && !r) return null;
  return (
    <ChartFrame id="form" title="Recent form">
      {g && latest ? (
        <div className={s.game}>
          <p className="t-caption t-subtle num">Latest game (since {formatDate(latest.since)})</p>
          <p className={`num ${s.gameLine}`}>
            {g.pts ?? 0} PTS · {g.reb ?? 0} REB · {g.ast ?? 0} AST · {g.stl ?? 0} STL · {g.blk ?? 0} BLK
          </p>
          <p className="t-caption t-subtle num">
            {g.fgm ?? 0}-{g.fga ?? 0} FG · {g.fg3m ?? 0}-{g.fg3a ?? 0} 3PT · {g.ftm ?? 0}-{g.fta ?? 0} FT · {g.mpg ?? 0} min ·
            Game Score {formatStat('game_score', g.game_score)}
          </p>
        </div>
      ) : null}
      {r && recent ? (
        <table className={s.table}>
          <caption className={`t-caption t-subtle num ${s.caption}`}>
            Since {formatDate(recent.since)}: {r.gp} {r.gp === 1 ? 'game' : 'games'}, against the season average
          </caption>
          <thead>
            <tr>
              <th scope="col">Stat</th>
              <th scope="col" className={s.right}>
                Recent
              </th>
              <th scope="col" className={s.right}>
                Season
              </th>
            </tr>
          </thead>
          <tbody>
            {RECENT_STATS.map((stat) => (
              <tr key={stat}>
                <th scope="row">{CATALOG[stat].label}</th>
                <td className={`num ${s.right} ${s.value}`}>{formatStat(stat, r[stat] ?? null)}</td>
                <td className={`num ${s.right}`}>{formatStat(stat, player.s[stat])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartFrame>
  );
}
