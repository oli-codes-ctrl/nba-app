import type { Metadata } from 'next';
import Link from 'next/link';

import { TeamChip } from '@/components/primitives';
import { luckAnswer, luckNoise, luckTeams, netNoise, ratedTeams, ratingsAnswer, signed } from '@/components/teams/answers';
import { luckPoints, quadTeams } from '@/components/teams/points';
import { Proven } from '@/components/teams/Proven';
import { LuckPanel, RatingsPanel } from '@/components/teams/TeamCharts';
import s from '@/components/teams/teams.module.css';
import type { TeamSeason } from '@/data/types';
import { formatDate, seasonLabel } from '@/lib/format';
import { ogImage, pageMeta } from '@/lib/meta';
import { teamPath } from '@/lib/routes';
import { loadData } from '@/server/data';
import { teamsByConference } from '@/teams/team';
import { teamInfo } from '@/theme/teams';

export function generateMetadata(): Metadata {
  const data = loadData();
  return pageMeta({
    title: `Team Ratings, Luck and Standings, ${seasonLabel(data.manifest.season)}`,
    description: `All 30 teams on offense and defense per 100 possessions, which records are running ahead of their point differential, and the standings by conference. Games through ${formatDate(data.teams.gamesThrough)}.`,
    path: '/teams',
    share: 'Every team, rated.',
    image: ogImage.page('teams'),
    imageAlt: 'Every team, rated: offense, defense and luck.',
  });
}

function winPct(t: TeamSeason): number {
  const games = (t.w ?? 0) + (t.l ?? 0);
  return games ? (t.w ?? 0) / games : 0;
}

export default function TeamsPage() {
  const data = loadData();
  const doc = data.teams;
  const through = formatDate(doc.gamesThrough);
  const rated = ratedTeams(doc);
  const lucky = luckTeams(doc);
  const ratings = netNoise(rated);
  const luck = luckNoise(lucky);
  const league = doc.league.ortg;
  const byAbbr = new Map(doc.teams.map((t) => [t.abbr, t]));
  const conferences = teamsByConference(data.players.players);

  return (
    <div className={`wrap ${s.page}`}>
      <header className={s.header}>
        <h1 className="t-display-md">Every team, rated.</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          Offense and defense for all {doc.teams.length} teams, which records are running ahead of the scoring, and the
          standings. Games through {through}.
        </p>
      </header>

      <div className={s.grid}>
        {rated.length >= 5 && league != null ? (
          <RatingsPanel
            title="Who’s actually good?"
            meta={`${rated.length} teams · points per 100 possessions · games through ${through}`}
            answer={ratingsAnswer(rated)}
            teams={quadTeams(doc)}
            league={league}
            noise={ratings.noise}
          />
        ) : null}
        <div className={s.column}>
          {lucky.length >= 5 && luck.noise != null ? (
            <LuckPanel
              title="Who’s been lucky?"
              meta={`Wins above or below what point differential predicts · ${lucky.length} teams`}
              answer={luckAnswer(lucky, luck.noise)}
              teams={luckPoints(doc)}
              noise={luck.noise}
              games={luck.games}
            />
          ) : null}
          {rated.length >= 5 ? <Proven teams={rated} noise={ratings.noise} games={ratings.games} /> : null}
        </div>
      </div>

      <section className={s.section} aria-labelledby="standings-title">
        <header className={s.sectionHead}>
          <h2 id="standings-title" className="t-headline">
            Where does everyone stand?
          </h2>
          <p className="t-body-sm t-subtle">
            By record within each conference, with the ratings behind it. “±” is how far luck could still move a net
            rating (95%).
          </p>
        </header>
        <div className={s.conferences}>
          {conferences.map(({ conf, teams }) => {
            const rows = teams
              .map((abbr) => byAbbr.get(abbr))
              .filter((t): t is TeamSeason => t != null)
              .sort((a, b) => winPct(b) - winPct(a) || (b.net ?? 0) - (a.net ?? 0));
            return (
              <div key={conf} className={s.tableScroll} tabIndex={0} role="region" aria-labelledby={`conf-${conf}`}>
                <table className={`${s.table} ${s.standings}`}>
                  <caption id={`conf-${conf}`} className={`t-card-title ${s.caption}`}>
                    {conf}ern Conference
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className={s.rank}>
                        <abbr title="Place by record">#</abbr>
                      </th>
                      <th scope="col">Team</th>
                      <th scope="col" className={s.right}>
                        <abbr title="Wins and losses">W–L</abbr>
                      </th>
                      <th scope="col" className={s.right}>
                        <abbr title="Net rating: points scored minus allowed per 100 possessions">Net</abbr>
                      </th>
                      <th scope="col" className={s.right}>
                        <abbr title="Offensive rating: points scored per 100 possessions">Off</abbr>
                      </th>
                      <th scope="col" className={s.right}>
                        <abbr title="Defensive rating: points allowed per 100 possessions">Def</abbr>
                      </th>
                      <th scope="col" className={s.right}>
                        <abbr title="Wins above what the point differential predicts">Luck</abbr>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t, i) => (
                      <tr key={t.abbr}>
                        <td className={`num ${s.rank}`}>{i + 1}</td>
                        <th scope="row">
                          <span className={s.teamCell}>
                            <TeamChip abbr={t.abbr} />
                            <Link href={teamPath(t.abbr)} className={`hit ${s.teamName} ${s.teamLink}`} prefetch={false}>
                              {teamInfo(t.abbr).name}
                            </Link>
                          </span>
                        </th>
                        <td className={`num ${s.right} ${s.strong}`}>
                          {t.w ?? 0}–{t.l ?? 0}
                        </td>
                        <td className={`num ${s.right}`}>
                          {t.net != null ? signed(t.net) : '–'}
                          {t.net_noise != null ? <span className={s.cellNote}>±{t.net_noise.toFixed(1)}</span> : null}
                        </td>
                        <td className={`num ${s.right}`}>{t.ortg != null ? t.ortg.toFixed(1) : '–'}</td>
                        <td className={`num ${s.right}`}>{t.drtg != null ? t.drtg.toFixed(1) : '–'}</td>
                        <td className={`num ${s.right}`}>{t.luck != null ? signed(t.luck) : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
