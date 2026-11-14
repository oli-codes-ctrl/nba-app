import type { Metadata } from 'next';
import Link from 'next/link';

import { ButtonLink } from '@/components/Button';
import { Disclosure } from '@/components/ChartFrame';
import { DailyFeature, OtherGames } from '@/components/games/GamesHub';
import g from '@/components/games/games.module.css';
import { buildDayPuzzleDate } from '@/components/games/puzzleDate';
import { Following } from '@/components/home/Following';
import s from '@/components/home/home.module.css';
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon } from '@/components/icons';
import { CardPreview } from '@/components/player/PercentileCard';
import { Avatar, TeamChip } from '@/components/primitives';
import { SearchTrigger } from '@/components/shell/SearchTrigger';
import { bestGames, gameLine, heatCheck, HEAT_Z, lastGameDate, type GameLog, type HeatRow } from '@/games/logs';
import { formatDate, formatStat, seasonLabel } from '@/lib/format';
import { ogImage, pageMeta } from '@/lib/meta';
import { playerPath, statPath } from '@/lib/routes';
import { SITE } from '@/lib/site';
import { cardRows } from '@/players/card';
import { loadData } from '@/server/data';
import { CATALOG, STAT_IDS } from '@/stats/catalog';
import { groupNoun, positionGroup, positionName } from '@/stats/views';
import { factOfTheDay, leaders, LEADER_STATS } from '@/today/feed';

const DAY_BEST = 8;
const SEASON_BEST = 8;
const HEAT_ROWS = 4;
const LEADER_ROWS = 5;

export const metadata: Metadata = pageMeta({
  title: { absolute: `${SITE.name}: Basketball Stats for Fans Who Argue` },
  description: SITE.description,
  path: '/',
  share: `${SITE.name}: ${SITE.tagline}`,
  image: ogImage.page('site'),
  imageAlt: `${SITE.name}: ${SITE.tagline} Players ranked, teams rated and three stat games.`,
});

/** "Nov 10" */
function shortDate(iso: string): string {
  return formatDate(iso).replace(/, \d{4}$/, '');
}

function result(game: GameLog): string {
  return `${game.won ? 'W' : 'L'} ${game.teamPts}–${game.oppPts} ${game.home ? 'vs' : 'at'} ${game.opp}`;
}

export default function HomePage() {
  const data = loadData();
  const all = data.players.players;
  const games = data.games;
  const date = games ? lastGameDate(games) : null;
  const day = games && date ? bestGames(games, data.playerById, DAY_BEST, { date }) : [];
  const season = games ? bestGames(games, data.playerById, SEASON_BEST) : [];
  const heat = games ? heatCheck(games, all) : null;
  const star = leaders(all, 'game_score', 1)[0];
  const starGroup = star ? positionGroup(star.pos) : null;
  const top = season[0];
  // One fact per data refresh, the same for every reader.
  const fact = factOfTheDay(all, data.through);
  const facts = [
    { value: String(data.manifest.playerCount), label: 'players this season' },
    { value: String(games ? games.games.length : data.manifest.qualifiedCount), label: games ? 'box scores read' : 'qualified to rank' },
    { value: String(STAT_IDS.length), label: 'stats per player' },
  ];

  return (
    <>
      <section className={s.hero} data-enter>
        <div className="wrap">
          <div className={`hero-text ${s.heroGrid}`}>
          <div className={s.heroText}>
            <p className={`t-body-sm num ${s.notice}`}>
              {seasonLabel(data.manifest.season)} season · games through {formatDate(data.through)}
            </p>
            <h1 className="t-display-lg">Basketball stats for fans who argue.</h1>
            <p className={`t-body-lg ${s.lead}`}>
              Every player ranked against the league and against his position, with ranges that tell real skill from a
              hot week. {data.manifest.playerCount} players, updated after every night of games.
            </p>
            <div className={s.actions}>
              <SearchTrigger />
              <ButtonLink href="/players">Browse All Players</ButtonLink>
            </div>
            <dl className={s.facts}>
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="t-caption">{f.label}</dt>
                  <dd className="num">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {star ? (
            <Link href={playerPath(star)} className={s.heroCard} aria-label={`${star.name}: see his full page`}>
              <span className={s.heroCardHead}>
                <Avatar name={star.name} size={44} />
                <span className={s.heroCardName}>
                  <span className={s.heroCardTitle}>
                    {star.name} <TeamChip abbr={star.team} />
                  </span>
                  <span className="t-caption t-subtle num">
                    {positionName(star.pos)} · leads the league in Game Score ·{' '}
                    {starGroup && star.pctPos
                      ? `percentiles among ${data.players.poolSizePos?.[starGroup]?.pts ?? 0} qualified ${groupNoun(starGroup)}`
                      : `percentiles among ${data.manifest.qualifiedCount} qualified players`}
                  </span>
                </span>
                <ChevronRightIcon />
              </span>
              <div data-ui="percentile card">
                <CardPreview rows={cardRows(star, all, starGroup && star.pctPos ? starGroup : null)} />
              </div>
            </Link>
          ) : null}
          </div>
        </div>
      </section>

      <Following />

      {games && date && day.length > 0 ? (
        <section className={s.section} aria-labelledby="night-title">
          <div className={`wrap ${s.sectionWrap}`}>
            <header className={s.head}>
              <h2 id="night-title" className="t-display-md">
                Who had the best game on {shortDate(date)}?
              </h2>
              <p className="t-body t-subtle">Every box score from the night, ranked by Game Score.</p>
            </header>
            <div className={s.split}>
              <ol className={`${s.panel} ${s.list}`}>
                {day.map(({ player, game }, i) => (
                  <li key={`${player.id}-${game.id}`}>
                    <Link href={playerPath(player)} className={`${s.row} ${s.gameRow}`}>
                      <span className={`num ${s.rank}`}>{i + 1}</span>
                      <Avatar name={player.name} size={36} />
                      <span className={s.who}>
                        <span className={s.name}>
                          {player.name} <TeamChip abbr={game.team} />
                        </span>
                        <span className="t-caption t-subtle num">
                          {result(game)} · {game.v.fgm}-{game.v.fga} FG · {game.v.min} min
                        </span>
                      </span>
                      <span className={`num ${s.line}`}>{gameLine(game.v)}</span>
                      <Bar value={game.v.gmsc} max={day[0].game.v.gmsc} />
                      <span className={s.score}>
                        <span className={`num ${s.scoreValue}`}>{game.v.gmsc.toFixed(1)}</span>
                        <span className="t-caption t-subtle">GmSc</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              <div className={s.side}>
              {heat ? (
                <div className={`${s.panel} ${s.heat}`}>
                  <div className={s.panelHead}>
                    <h3 className="t-card-title">Heat check</h3>
                    <p className="t-caption t-subtle num">
                      Last {heat.recentGames} games against each player’s earlier ones · {heat.checked} players checked
                    </p>
                  </div>
                  {heat.hot.length + heat.cold.length === 0 ? (
                    <p className={`t-body-sm ${s.calm}`}>
                      <strong>No real streaks right now.</strong> Every hot or cold run so far is within normal luck.
                    </p>
                  ) : (
                    <ul className={s.list}>
                      {[...heat.hot.slice(0, HEAT_ROWS), ...heat.cold.slice(0, HEAT_ROWS)].map((row) => (
                        <li key={row.player.id}>
                          <HeatLine row={row} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <Disclosure summary="How to Read This">
                    <p>
                      Game Score over his last {heat.recentGames} games against his games before them. A streak
                      counts only past {HEAT_Z} standard errors of his own game-to-game swings, since {heat.checked}{' '}
                      players are checked at once and some would look hot by luck alone.
                    </p>
                  </Disclosure>
                </div>
              ) : null}
              {fact ? (
                <div className={`${s.panel} ${s.fact}`}>
                  <h3 className="t-card-title">Stat of the day</h3>
                  <p className="t-body-lg">{fact.text}</p>
                  <p className={s.factLinks}>
                    {fact.playerIds.map((id) => {
                      const p = data.playerById.get(id);
                      return p ? (
                        <Link key={id} href={playerPath(p)} className="link">
                          {p.name}
                        </Link>
                      ) : null;
                    })}
                  </p>
                </div>
              ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className={s.section} aria-labelledby="leaders-title">
        <div className={`wrap ${s.sectionWrap}`}>
          <header className={s.head}>
            <h2 id="leaders-title" className="t-display-md">
              Who leads the league?
            </h2>
            <p className="t-body t-subtle num">
              Top {LEADER_ROWS} in {LEADER_STATS.length} stats among the {data.manifest.qualifiedCount} players with enough games and minutes to rank.
            </p>
          </header>
          <div className={s.leaders}>
            {LEADER_STATS.map((stat) => (
              <div key={stat} className={`${s.panel} ${s.leader}`}>
                <p className={s.leaderTitle} id={`leaders-${stat}`}>
                  <Link href={statPath(stat)} className={s.leaderLink} prefetch={false}>
                    {CATALOG[stat].label}
                    <ChevronRightIcon size={14} />
                  </Link>
                </p>
                <ol aria-labelledby={`leaders-${stat}`}>
                  {leaders(all, stat, LEADER_ROWS).map((p, i, list) => (
                    <li key={p.id}>
                      <Link href={playerPath(p)} className={s.leaderRow} prefetch={false}>
                        <span
                          className={s.cellBar}
                          style={{ width: `${share(p.s[stat] ?? 0, list[0]?.s[stat] ?? 0) * 100}%` }}
                          aria-hidden="true"
                        />
                        <span className={`num ${s.rank}`}>{i + 1}</span>
                        <span className={s.leaderName}>{p.name}</span>
                        <span className={`num ${s.leaderValue}`}>{formatStat(stat, p.s[stat])}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {top && season.length > 0 ? (
        <section className={s.section} aria-labelledby="season-title">
          <div className={`wrap ${s.sectionWrap}`}>
            <header className={s.head}>
              <h2 id="season-title" className="t-display-md">
                What are the best games of the season?
              </h2>
              <p className="t-body t-subtle">The top single-game Game Scores so far.</p>
            </header>
            <div className={s.split}>
              <ol className={`${s.panel} ${s.list}`}>
                {season.map(({ player, game }, i) => (
                  <li key={`${player.id}-${game.id}`}>
                    <Link href={playerPath(player)} className={`${s.row} ${s.gameRow}`} prefetch={false}>
                      <span className={`num ${s.rank}`}>{i + 1}</span>
                      <Avatar name={player.name} size={36} />
                      <span className={s.who}>
                        <span className={s.name}>
                          {player.name} <TeamChip abbr={game.team} />
                        </span>
                        <span className="t-caption t-subtle num">
                          {shortDate(game.date)} {game.home ? 'vs' : 'at'} {game.opp} · {game.won ? 'W' : 'L'}{' '}
                          {game.teamPts}–{game.oppPts}
                        </span>
                      </span>
                      <span className={`num ${s.line}`}>{gameLine(game.v)}</span>
                      <Bar value={game.v.gmsc} max={top.game.v.gmsc} />
                      <span className={s.score}>
                        <span className={`num ${s.scoreValue}`}>{game.v.gmsc.toFixed(1)}</span>
                        <span className="t-caption t-subtle">GmSc</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              <Link href={playerPath(top.player)} className={`${s.panel} ${s.feature}`}>
                <span className="t-eyebrow t-subtle">Game of the season so far</span>
                <span className={`num ${s.featureScore}`}>{top.game.v.gmsc.toFixed(1)}</span>
                <span className="t-caption t-subtle">Game Score</span>
                <span className={s.featureName}>
                  {top.player.name} <TeamChip abbr={top.game.team} />
                </span>
                <span className={`num ${s.featureLine}`}>{gameLine(top.game.v)}</span>
                <span className="t-body-sm t-subtle num">
                  {top.game.v.fgm}-{top.game.v.fga} FG · {top.game.v.fg3m}-{top.game.v.fg3a} 3PT · {top.game.v.ftm}-
                  {top.game.v.fta} FT · {top.game.v.min} min
                </span>
                <span className="t-body-sm t-subtle num">
                  {formatDate(top.game.date)} · {result(top.game)}
                </span>
                <span className={s.featureMore}>
                  See His Season <ChevronRightIcon size={14} />
                </span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className={s.section} aria-labelledby="play-title">
        <div className={`wrap ${s.sectionWrap}`}>
          <header className={s.head}>
            <h2 id="play-title" className="t-display-md">
              Think you know the league?
            </h2>
            <p className="t-body t-subtle">
              Quick games built on this season’s numbers. No account: your scores stay in this browser.
            </p>
          </header>
          <div className={g.hubGrid}>
            <DailyFeature puzzles={data.puzzles.puzzles} buildDate={buildDayPuzzleDate(data.through)} level={3} />
            <div className={g.more}>
              <h3 className="t-card-title">What else can you play?</h3>
              <OtherGames />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** A value as a share of the best in its list (0 to 1). */
function share(value: number, max: number): number {
  return max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
}

/** A value against the best in its list, from zero. Decorative: the number beside it carries the value. */
function Bar({ value, max }: { value: number; max: number }) {
  return (
    <svg className={s.bar} viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect className={s.barTrack} width="100" height="6" rx="3" />
      <rect className={s.barFill} width={Math.max(3, share(value, max) * 100)} height="6" rx="3" />
    </svg>
  );
}

function HeatLine({ row }: { row: HeatRow }) {
  const up = row.z > 0;
  return (
    <Link
      href={playerPath(row.player)}
      className={s.row}
      aria-label={`${row.player.name} is running ${up ? 'hot' : 'cold'}: Game Score ${row.recent.toFixed(1)} over his last ${row.recentGames} games, ${row.before.toFixed(1)} before`}>
      <Avatar name={row.player.name} size={36} />
      <span className={s.who}>
        <span className={s.name}>
          {row.player.name} <TeamChip abbr={row.player.team} />
        </span>
        <span className="t-caption t-subtle num">
          {up ? 'Running hot' : 'Running cold'} · before {row.before.toFixed(1)}
        </span>
      </span>
      <span className={s.score}>
        <span className={`num ${s.scoreValue}`}>{row.recent.toFixed(1)}</span>
        <span className={`t-caption t-subtle num ${s.delta}`}>
          {up ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
          {Math.abs(row.recent - row.before).toFixed(1)}
        </span>
      </span>
    </Link>
  );
}
