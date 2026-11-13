import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { TeamVisit } from '@/components/games/Counters';
import pl from '@/components/player/player.module.css';
import { Avatar, Note, StatTiles, type Tile } from '@/components/primitives';
import { luckAnswer, luckNoise, luckTeams, netNoise, ratedTeams, ratingsAnswer, signed } from '@/components/teams/answers';
import { FourFactors } from '@/components/teams/FourFactors';
import { luckPoints, quadTeams } from '@/components/teams/points';
import { LuckPanel, RatingsPanel } from '@/components/teams/TeamCharts';
import s from '@/components/teams/teams.module.css';
import { formatDate, formatStat, ordinal, seasonLabel } from '@/lib/format';
import { playerPath } from '@/lib/routes';
import { loadData } from '@/server/data';
import { CATALOG } from '@/stats/catalog';
import { hasSample } from '@/stats/samples';
import { positionName } from '@/stats/views';
import { factorRows } from '@/teams/analysis';
import { roster, TEAM_LEADER_STATS, teamLeader, teamsByConference } from '@/teams/team';
import { TEAMS, teamInfo } from '@/theme/teams';

type Params = { params: Promise<{ abbr: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(TEAMS).map((abbr) => ({ abbr: abbr.toLowerCase() }));
}

function findAbbr(param: string): string | null {
  const abbr = param.toUpperCase();
  // One canonical URL per team: lowercase only.
  return TEAMS[abbr] && param === abbr.toLowerCase() ? abbr : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const abbr = findAbbr((await params).abbr);
  if (!abbr) return {};
  const data = loadData();
  const t = data.teams.teams.find((x) => x.abbr === abbr);
  const name = teamInfo(abbr).name;
  const record = t && t.w != null && t.l != null ? `${t.w}–${t.l}` : null;
  const description =
    `${name} in ${seasonLabel(data.manifest.season)}${record ? `: ${record}` : ''}` +
    (t?.net != null ? `, ${signed(t.net)} net rating per 100 possessions` : '') +
    `. Are they for real, have they been lucky, where they win and lose, and who leads them. Games through ${formatDate(data.teams.gamesThrough)}.`;
  return {
    title: `${name} Team Stats, Ratings and Roster`,
    description,
    alternates: { canonical: `/teams/${abbr.toLowerCase()}` },
    openGraph: { title: `Is ${name} for real?`, description, url: `/teams/${abbr.toLowerCase()}` },
  };
}

export default async function TeamPage({ params }: Params) {
  const abbr = findAbbr((await params).abbr);
  if (!abbr) notFound();
  const data = loadData();
  const doc = data.teams;
  const name = teamInfo(abbr).name;
  const season = doc.teams.find((t) => t.abbr === abbr);
  const players = roster(data.players.players, abbr);
  const conf = teamsByConference(data.players.players).find((c) => c.teams.includes(abbr))?.conf;
  const through = formatDate(doc.gamesThrough);
  const n = doc.teams.length;
  const rules = data.players.minAttempts;

  const rated = ratedTeams(doc);
  const lucky = luckTeams(doc);
  const focusRated = rated.find((t) => t.abbr === abbr);
  const focusLuck = lucky.find((t) => t.abbr === abbr);
  const ratings = netNoise(rated);
  const luck = luckNoise(lucky);
  const league = doc.league.ortg;

  const rankNote = (r: number | undefined, fastest = false) => (r ? `${ordinal(r)}${fastest ? ' fastest' : ''} of ${n}` : undefined);
  const expectedW = season?.pyth_w == null ? null : Math.round(season.pyth_w);
  const tiles: Tile[] = season
    ? [
        {
          label: 'Record',
          value: season.w != null && season.l != null ? `${season.w}–${season.l}` : '–',
          note: expectedW != null ? `Point differential says ${expectedW}–${season.gp - expectedW}` : undefined,
        },
        {
          label: 'Net rating',
          title: 'Points scored minus allowed per 100 possessions',
          value: season.net == null ? '–' : signed(season.net),
          note: rankNote(season.rank.net),
        },
        {
          label: 'Offense',
          title: 'Points scored per 100 possessions',
          value: season.ortg == null ? '–' : season.ortg.toFixed(1),
          note: rankNote(season.rank.ortg),
        },
        {
          label: 'Defense',
          title: 'Points allowed per 100 possessions',
          value: season.drtg == null ? '–' : season.drtg.toFixed(1),
          note: rankNote(season.rank.drtg),
        },
        {
          label: 'Pace',
          title: 'Possessions per game',
          value: season.pace == null ? '–' : season.pace.toFixed(1),
          note: rankNote(season.rank.pace, true),
        },
      ]
    : [];

  const leaders = TEAM_LEADER_STATS.map((stat) => ({ stat, player: teamLeader(players, stat) })).filter(
    (l): l is { stat: (typeof TEAM_LEADER_STATS)[number]; player: NonNullable<ReturnType<typeof teamLeader>> } => l.player != null,
  );

  return (
    <div className={`wrap ${s.page}`}>
      <TeamVisit abbr={abbr} />
      <nav aria-label="Breadcrumb" className={`t-caption ${pl.crumbs}`}>
        <Link href="/teams" className={pl.crumb}>
          Teams
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{name}</span>
      </nav>

      <header className={s.teamHeader}>
        <span className={s.teamMark} aria-hidden="true">
          <span className={s.teamSwatch} style={{ background: teamInfo(abbr).color }} />
          {abbr}
        </span>
        <div className={s.teamTitles}>
          <h1 className="t-display-md">{name}</h1>
          <p className="t-body-sm t-subtle num">
            {[
              conf ? `${conf}ern Conference` : null,
              season ? `${season.gp} ${season.gp === 1 ? 'game' : 'games'}` : null,
              `${players.length} ${players.length === 1 ? 'player' : 'players'} this season`,
              `games through ${through}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </header>

      {tiles.length ? <StatTiles tiles={tiles} label={`${name} at a glance, with league ranks`} /> : null}
      {!season ? <Note>No team totals are published for {name} yet.</Note> : null}

      {season ? (
        <div className={s.grid}>
          {focusRated && league != null ? (
            <RatingsPanel
              title={`Is ${name} for real?`}
              meta={`${rated.length} teams · points per 100 possessions · games through ${through}`}
              answer={ratingsAnswer(rated, focusRated)}
              teams={quadTeams(doc)}
              league={league}
              noise={ratings.noise}
              highlight={abbr}
            />
          ) : null}
          <div className={s.column}>
            {focusLuck && luck.noise != null ? (
              <LuckPanel
                title="Lucky or good?"
                meta={`Wins above or below what point differential predicts · ${lucky.length} teams`}
                answer={luckAnswer(lucky, luck.noise, focusLuck)}
                teams={luckPoints(doc)}
                noise={luck.noise}
                games={luck.games}
                highlight={abbr}
              />
            ) : null}
            {leaders.length > 0 ? (
              <section className={s.panel} aria-labelledby="leaders-title">
                <header className={s.panelHead}>
                  <h2 id="leaders-title" className="t-card-title">
                    Who leads the team?
                  </h2>
                  <p className="t-caption t-subtle">Among players ranked in each stat</p>
                </header>
                <ul className={s.leaders}>
                  {leaders.map(({ stat, player }) => (
                    <li key={stat}>
                      <Link href={playerPath(player)} className={s.leader} prefetch={false}>
                        <span className={s.leaderStat}>{CATALOG[stat].label}</span>
                        <span className={`num ${s.leaderValue}`}>{formatStat(stat, player.s[stat])}</span>
                        <span className={s.leaderName}>{player.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {season ? <FourFactors name={name} sides={factorRows(season, doc.teams, doc.league)} teams={n} through={through} /> : null}

      <section className={s.section} aria-labelledby="roster-title">
        <header className={s.sectionHead}>
          <h2 id="roster-title" className="t-headline">
            Who plays the most?
          </h2>
          <p className="t-body-sm t-subtle">
            Everyone who has played for {name} this season and is still on the team, most minutes first. Traded players
            show their whole season.
          </p>
        </header>
        {players.length === 0 ? (
          <Note>No players on this team in today’s data.</Note>
        ) : (
          <div className={s.tableScroll} tabIndex={0} role="region" aria-label={`${name} roster`}>
            <table className={`${s.table} ${s.roster}`}>
              <caption className="visually-hidden">{name} roster, most minutes first</caption>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  {(['gp', 'mpg', 'pts', 'reb', 'ast', 'fg3m', 'ts_pct', 'game_score'] as const).map((stat) => (
                    <th key={stat} scope="col" className={s.right}>
                      <abbr title={CATALOG[stat].label}>{CATALOG[stat].short}</abbr>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">
                      <Link href={playerPath(p)} className={s.rosterPlayer} prefetch={false}>
                        <Avatar name={p.name} size={28} />
                        <span className={s.rosterText}>
                          <span className={s.rosterName}>{p.name}</span>
                          <span className={`t-caption ${s.rosterMeta}`}>
                            {positionName(p.pos)}
                            {p.q ? '' : ' · not qualified yet'}
                            {p.teams.length > 1 ? ` · also ${p.teams.slice(1).join(', ')}` : ''}
                          </span>
                        </span>
                      </Link>
                    </th>
                    {(['gp', 'mpg', 'pts', 'reb', 'ast', 'fg3m', 'ts_pct', 'game_score'] as const).map((stat) => (
                      <td
                        key={stat}
                        className={`num ${s.right} ${stat === 'game_score' ? s.strong : ''} ${hasSample(p, stat, rules) ? '' : s.thin}`}
                        title={hasSample(p, stat, rules) ? undefined : 'Too few attempts to rank'}>
                        {formatStat(stat, p.s[stat])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
