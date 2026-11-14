import type { Metadata } from 'next';
import Link from 'next/link';

import s from '@/components/reference/reference.module.css';
import type { AttemptKey } from '@/data/types';
import { formatDate, seasonLabel } from '@/lib/format';
import { ogImage, pageMeta } from '@/lib/meta';
import { SITE } from '@/lib/site';
import { loadData } from '@/server/data';
import { CATALOG, type StatId } from '@/stats/catalog';

export function generateMetadata(): Metadata {
  return pageMeta({
    title: 'About the Data',
    description: `Where ${SITE.name}’s numbers come from, when they update, who gets ranked, how ranges separate skill from luck, what isn’t covered, and what the site keeps about you (nothing beyond this browser).`,
    path: '/about',
    share: 'Where do these numbers come from?',
    image: ogImage.page('about'),
    imageAlt: 'Where do these numbers come from? About the data.',
  });
}

const ATTEMPTS: Record<AttemptKey, string> = {
  fga: 'Shots',
  fg2a: 'Two-point attempts',
  fg3a: 'Three-point attempts',
  fta: 'Free throw attempts',
};

const QUESTIONS = [
  { id: 'what', title: 'What is this?' },
  { id: 'source', title: 'Where does the data come from?' },
  { id: 'ranked', title: 'Who gets ranked?' },
  { id: 'sure', title: 'How sure can a number be?' },
  { id: 'teams', title: 'How are teams judged?' },
  { id: 'missing', title: 'What isn’t here?' },
  { id: 'formulas', title: 'Where do the formulas come from?' },
  { id: 'privacy', title: 'What does the site keep about me?' },
] as const;

function Question({ id, children }: { id: (typeof QUESTIONS)[number]['id']; children: React.ReactNode }) {
  const q = QUESTIONS.find((x) => x.id === id)!;
  return (
    <section id={id} className={`${s.section} ${s.qa}`} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="t-headline">
        {q.title}
      </h2>
      <div className={`t-body t-muted ${s.prose}`}>{children}</div>
    </section>
  );
}

function G({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link href={`/glossary#${id}`} className="link">
      {children}
    </Link>
  );
}

export default function AboutPage() {
  const data = loadData();
  const m = data.manifest;
  const rules = data.players.minAttempts ?? {};
  const boxThrough = data.games?.boxScoresThrough;
  const minimums = Object.entries(rules)
    .filter((e): e is [StatId, NonNullable<(typeof e)[1]>] => e[1] != null)
    .map(([stat, rule]) => ({ stat, ...rule }));

  return (
    <div className={`wrap ${s.page}`}>
      <header className={s.header}>
        <h1 className="t-display-md">Where do these numbers come from?</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          How the stats are gathered, checked and ranked, and what the site can and can’t tell you. Every term has a plain
          definition in the{' '}
          <Link href="/glossary" className="link">
            Glossary
          </Link>
          .
        </p>
      </header>

      <div className={s.layout}>
        <aside className={s.rail} aria-label="On this page">
          <p className={`t-eyebrow t-subtle ${s.railTitle}`}>On this page</p>
          <ul className={s.toc}>
            {QUESTIONS.map((q) => (
              <li key={q.id}>
                <a href={`#${q.id}`} className={s.tocLink}>
                  {q.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div className={s.content}>
          <Question id="what">
            <p>
              {SITE.name} is an independent stats site for fans who argue about basketball. Search any player or team and
              get the answer to the questions fans actually argue about (is he as good as people say, is that team for
              real, who’s the better shooter), ranked fairly against qualified players and explained in plain English.
              There are also three games built on the season’s numbers.
            </p>
            <p>
              It covers the current season ({seasonLabel(m.season)}), regular-season games only.
            </p>
          </Question>

          <Question id="source">
            <p>
              Season totals, team totals, standings and box scores come from ESPN’s public stats feeds. Every derived
              number (true shooting, usage, ratings, percentiles, ranges) is computed here from those totals, with the
              formulas listed below.
            </p>
            <p>
              The data refreshes every morning, US time. It is published only once it is complete: every team’s games
              must match the standings, and the players’ points must add up to their teams’ points. Until then the site
              keeps showing the last complete day, so a number is never half-updated. Every page says which games it
              includes (“games through”), never the time it was built.
            </p>
            <dl className={s.facts}>
              <div className={`${s.fact} ${s.factWide}`}>
                <dt>Games through</dt>
                <dd>{formatDate(data.through)}</dd>
              </div>
              <div className={s.fact}>
                <dt>Players</dt>
                <dd>{m.playerCount}</dd>
              </div>
              <div className={s.fact}>
                <dt>Qualified to rank</dt>
                <dd>{m.qualifiedCount}</dd>
              </div>
              <div className={s.fact}>
                <dt>Box scores</dt>
                <dd>{data.games ? data.games.games.length : '–'}</dd>
              </div>
            </dl>
            {boxThrough && boxThrough !== data.through ? (
              <p className="t-body-sm t-subtle">
                Box scores run through {formatDate(boxThrough)}: one game’s summary was missing on the last refresh and is
                fetched again on the next.
              </p>
            ) : null}
            <p>
              Player names are spelled as the source spells them, which currently drops accents (Nikola Jokic, not
              Jokić).
            </p>
          </Question>

          <Question id="ranked">
            <p>
              Only <G id="qualified">qualified players</G> are ranked: at least 10 minutes a game, and games in at least
              20% of the most any team has played (never fewer than 3). Today that’s {m.qualifiedCount} of{' '}
              {m.playerCount} players. Everyone else still has a page and a stat line, just no ranks.
            </p>
            <p>
              Shooting percentages need enough attempts as well, so a 3-for-3 night never tops a leaderboard. The{' '}
              <G id="attempt-minimum">minimums</G> grow with the season. Today:
            </p>
            <div className={s.tableScroll}>
              <table className={s.minTable}>
                <caption className="visually-hidden">Attempts needed before each stat is ranked</caption>
                <thead>
                  <tr>
                    <th scope="col">Stat</th>
                    <th scope="col">Counts</th>
                    <th scope="col" className={s.numCell}>
                      Needed today
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {minimums.map((r) => (
                    <tr key={r.stat}>
                      <th scope="row" className={s.rowHead}>
                        {CATALOG[r.stat].label}
                      </th>
                      <td>{ATTEMPTS[r.by]}</td>
                      <td className={`num ${s.numCell}`}>{r.min}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              A <G id="percentile">percentile</G> is the share of qualified players he ranks above, counted from the
              actual order, never from a bell curve. Player pages open on <G id="position-ranks">position ranks</G>{' '}
              (guards, forwards or centers) and can switch to everyone. <G id="role-stats">Role stats</G> such as usage
              are ranked but never called good or bad.
            </p>
          </Question>

          <Question id="sure">
            <p>
              A season so far is a sample, and small samples lie. So the site shows how much each number could still
              move:
            </p>
            <ul>
              <li>
                A <G id="likely-range">likely range</G> for shooting, counting stats and Game Score: where his long-run
                level probably sits given how much he has played.
              </li>
              <li>
                A <G id="skill-estimate">skill estimate</G> for three-point and free throw shooting that pulls a short hot
                streak toward the league average.
              </li>
              <li>
                “Elite” and “weak spot” only when the whole <G id="rank-band">rank band</G> agrees; head-to-heads call a{' '}
                <G id="clear-edge">clear edge</G> only when the gap beats luck.
              </li>
              <li>
                Trends and the <G id="heat-check">heat check</G> flag a hot or cold run only when it is bigger than normal
                game-to-game swings.
              </li>
            </ul>
          </Question>

          <Question id="teams">
            <p>
              Teams are rated per 100 possessions, so fast and slow teams compare fairly. A team is called better or worse
              than average only when its <G id="net-rating">net rating</G> clears what luck alone could produce after this
              many games, and lucky or unlucky only when its record sits outside the{' '}
              <G id="team-luck-term">normal-luck band</G> around its expected wins.
            </p>
            <p>
              The luck model assumes game margins vary about 12 points around the expected margin, a widely quoted figure.
              It will be replaced by the spread measured from this season’s box scores.
            </p>
          </Question>

          <Question id="missing">
            <p>Some things the public data doesn’t include, so the site doesn’t pretend to know them:</p>
            <ul>
              <li>Salaries and contracts.</li>
              <li>Lineups and on/off numbers (how a team does with a player on the court versus off it).</li>
              <li>Tracking data: speed, distance, defensive matchups.</li>
              <li>Shot locations and clutch splits (possible later, from play-by-play).</li>
              <li>Live stats during games, the playoffs, and past seasons.</li>
            </ul>
            <p>
              Players traded this season appear as one combined line under their current team; their team-based stats
              (usage and the other shares) average the teams they played for.
            </p>
          </Question>

          <Question id="formulas">
            <p>Every formula is written out in the Glossary. They follow published, standard sources:</p>
            <ul>
              <li>Basketball-Reference’s glossary: shooting, shares of team play, per 36 and per 100 (formulas only).</li>
              <li>Dean Oliver, “Basketball on Paper” (2004): possessions and the four factors.</li>
              <li>John Hollinger, “Pro Basketball Prospectus” (2002): Game Score.</li>
              <li>Daryl Morey: expected wins from points scored and allowed (exponent 14).</li>
              <li>Wayne Winston: the 12-point spread of game margins.</li>
            </ul>
          </Question>

          <Question id="privacy">
            <p>
              Nothing leaves your browser. There are no accounts, ads or tracking. Players you follow, game progress,
              streaks and trophies are kept in this browser’s own storage, so they stay on this device and disappear if
              you clear site data.
            </p>
            <p>
              {SITE.name} is an independent fan project. It is not affiliated with or endorsed by any league, team or
              broadcaster, and uses no logos or player photos: teams appear as their abbreviation and players as their
              initials.
            </p>
          </Question>
        </div>
      </div>
    </div>
  );
}
