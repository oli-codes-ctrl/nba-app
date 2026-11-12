import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ButtonLink } from '@/components/Button';
import { ChartFrame } from '@/components/ChartFrame';
import { CompareIcon } from '@/components/icons';
import { FollowButton } from '@/components/player/FollowButton';
import { GameTrend } from '@/components/player/GameTrend';
import { PercentileCard } from '@/components/player/PercentileCard';
import s from '@/components/player/player.module.css';
import { PoolProvider, PoolSwitch, PoolView } from '@/components/player/pool';
import { StatTables } from '@/components/player/StatTables';
import { Avatar, Note, StatTiles, TeamChip, type Tile } from '@/components/primitives';
import type { Player } from '@/data/types';
import { playerLog } from '@/games/logs';
import { shortName } from '@/graphs/analysis';
import { formatDate, formatStat, rankText, seasonLabel } from '@/lib/format';
import { comparePath, idFromSlug, playerPath, playerSlug, statPath, teamPath } from '@/lib/routes';
import { cardInsights, cardRows } from '@/players/card';
import { comps } from '@/players/similar';
import { loadData, type SiteData } from '@/server/data';
import { CATALOG, type StatId } from '@/stats/catalog';
import { groupNoun, positionGroup, positionName, type PositionGroup } from '@/stats/views';
import { teamInfo } from '@/theme/teams';

/** Below this many team games, the page warns that ranks are volatile. */
const EARLY_SEASON_GAMES = 20;
const TILE_STATS: readonly StatId[] = ['pts', 'reb', 'ast', 'ts_pct', 'game_score', 'mpg'];
const RECENT_STATS: readonly StatId[] = ['pts', 'reb', 'ast', 'fg3m', 'ts_pct'];

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
  return {
    title,
    description,
    alternates: { canonical: playerPath(player) },
    openGraph: { title: `${player.name}: How Good Is He, Really?`, description, url: playerPath(player), type: 'profile' },
  };
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

  return (
    <div className={`container ${s.page}`}>
      <nav aria-label="Breadcrumb" className={`t-caption ${s.crumbs}`}>
        <Link href="/players" className={s.crumb}>
          Players
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{player.name}</span>
      </nav>

      <header className={s.header}>
        <div className={s.identity}>
          <span className={s.portrait}>
            <Avatar name={player.name} size={64} />
          </span>
          <div className={s.titles}>
            <h1 className="t-display-md">{player.name}</h1>
            <div className={`t-body-sm ${s.metaClip}`}>
              <ul className={s.metaList}>
                <li>
                  <TeamChip abbr={player.team} />
                  <Link href={teamPath(player.team)} className="link">
                    {teamInfo(player.team).name}
                  </Link>
                </li>
                <li>{positionName(player.pos)}</li>
                {player.s.age != null ? <li className="num">Age {player.s.age}</li> : null}
                <li className="num">
                  {player.s.gp ?? 0} {player.s.gp === 1 ? 'game' : 'games'}
                </li>
              </ul>
            </div>
            {earlierTeams.length > 0 ? (
              <p className={`t-caption ${s.meta}`}>
                Earlier this season:
                {earlierTeams.map((t) => (
                  <TeamChip key={t} abbr={t} link muted />
                ))}
              </p>
            ) : null}
          </div>
        </div>
        <div className={s.actions}>
          <FollowButton id={player.id} name={player.name} />
          <ButtonLink variant="primary" href={comparePath(player.id)} icon={<CompareIcon />}>
            Compare
          </ButtonLink>
        </div>
      </header>

      <StatTiles tiles={tiles} label={`${player.name} season averages, with his rank among qualified players`} />

      {!player.q ? (
        <Note>
          Not enough games or minutes yet to rank against qualified players. Season averages are shown without
          percentiles.
        </Note>
      ) : data.mostGames > 0 && data.mostGames < EARLY_SEASON_GAMES ? (
        <Note>
          Early season: teams have played about {data.mostGames} games, so these ranks can swing a lot from night to
          night.
        </Note>
      ) : null}

      <PoolProvider groupLabel={groupLabel}>
        {groupLabel ? (
          <div className={s.toolbar}>
            <p className="t-body-sm t-subtle">Ranks compare him with</p>
            <PoolSwitch groupLabel={groupLabel} />
          </div>
        ) : null}

        <div className={s.grid}>
          {player.q
            ? pools.map(({ pool, group: g }) => {
                const rows = cardRows(player, all, g);
                const size = g ? data.players.poolSizePos?.[g] ?? {} : data.players.poolSize;
                return (
                  <PoolView key={pool} pool={pool}>
                    <PercentileCard
                      id="card"
                      title={`How good is ${short}, really?`}
                      poolText={`${size.pts ?? 0} qualified ${g ? groupNoun(g) : 'players'}`}
                      through={through}
                      rows={rows}
                      insights={cardInsights(rows)}
                      playerId={player.id}
                      pool={g ?? 'all'}
                    />
                  </PoolView>
                );
              })
            : null}

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
                meta="Closest styles this season · 100 means the same style"
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
                            <span className={`t-caption ${s.compWhy}`}>Both: {drivers.map((d) => d.text).join(' · ')}</span>
                          ) : null}
                        </span>
                        <span className={s.compMatch}>
                          <span className={`num ${s.compScore}`}>{Math.round(100 * match)}</span>
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

        <section className={s.every} aria-labelledby="every-title">
          <header className={s.everyHead}>
            <h2 id="every-title" className="t-card-title">
              Every stat
            </h2>
            <p className="t-body-sm t-subtle">
              {player.q
                ? 'Season numbers with where he ranks among qualified players. Select a stat to see everyone.'
                : 'Season numbers. Ranks appear once he has enough games and minutes.'}
            </p>
          </header>
          {pools.map(({ pool, group: g }) => (
            <PoolView key={pool} pool={pool}>
              <StatTables
                player={player}
                ranks={
                  g
                    ? { pct: player.pctPos, rank: player.rankPos, size: data.players.poolSizePos?.[g] ?? {} }
                    : { pct: player.pct, rank: player.rank, size: data.players.poolSize }
                }
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
        </section>
      </PoolProvider>
    </div>
  );
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
