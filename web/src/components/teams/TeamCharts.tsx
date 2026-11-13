'use client';

import Link from 'next/link';

import { LuckStrip, type LuckPoint } from '@/charts/LuckStrip';
import c from '@/charts/charts.module.css';
import { TeamQuadrantChart, type QuadTeam } from '@/charts/TeamQuadrantChart';
import { Button } from '@/components/Button';
import { ChartFrame } from '@/components/ChartFrame';
import { ChartIcon, TableIcon } from '@/components/icons';
import { TeamChip } from '@/components/primitives';
import { ordinal } from '@/lib/format';
import { teamPath } from '@/lib/routes';
import { useQueryParam } from '@/lib/useQueryParam';

import s from './teams.module.css';

const VIEWS = ['chart', 'table'] as const;
type View = (typeof VIEWS)[number];

function signed(v: number): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <Button
      variant="tertiary"
      aria-pressed={view === 'table'}
      icon={view === 'table' ? <ChartIcon /> : <TableIcon />}
      onClick={() => onChange(view === 'table' ? 'chart' : 'table')}>
      {view === 'table' ? 'Chart' : 'Table'}
    </Button>
  );
}

function TeamCell({ abbr, name, current }: { abbr: string; name: string; current: boolean }) {
  return (
    <span className={s.teamCell}>
      <TeamChip abbr={abbr} />
      {current ? (
        <span className={s.teamName} aria-current="page">
          {name}
        </span>
      ) : (
        <Link href={teamPath(abbr)} className={`hit ${s.teamName} ${s.teamLink}`} prefetch={false}>
          {name}
        </Link>
      )}
    </span>
  );
}

type RatingsProps = {
  id?: string;
  title: string;
  meta: string;
  answer: string;
  teams: readonly QuadTeam[];
  league: number;
  /** The usual net-rating noise, for the method note. */
  noise: number | null;
  highlight?: string | null;
};

/** "Who's actually good?" / "Is X for real?": offense against defense, with what luck could still change. */
export function RatingsPanel({ id = 'ratings', title, meta, answer, teams, league, noise, highlight = null }: RatingsProps) {
  const [view, setView] = useQueryParam<View>(id, 'chart', VIEWS);
  const sorted = [...teams].sort((a, b) => b.net - a.net);
  const best = sorted[0];
  const focus = highlight ? teams.find((t) => t.abbr === highlight) : undefined;
  return (
    <ChartFrame
      id={id}
      title={title}
      meta={meta}
      controls={<ViewToggle view={view} onChange={setView} />}
      answer={<p>{answer}</p>}
      howTo={
        <>
          <p>
            Offense and defense are points scored and allowed per 100 possessions, so fast and slow teams compare
            fairly. Right scores more; up allows fewer.
          </p>
          <p>
            Each diagonal is a net rating (scored minus allowed), every 5 points; the solid one is break-even. The
            dashed lines are the league average of {league.toFixed(1)}, which split the four corners.
          </p>
          <p>
            A team is only called better or worse than average when its net rating clears game-to-game luck (95%),
            using the usual 12-point spread of game margins
            {noise != null ? `: about ±${noise.toFixed(1)} per 100 possessions at this point of the season` : ''}.
            Select a team to open its page.
          </p>
        </>
      }>
      {view === 'table' ? (
        <div className={s.tableScroll} tabIndex={0} role="region" aria-label={`${title} as a table`}>
          <table className={s.table}>
            <caption className="visually-hidden">Teams by net rating, with offense and defense per 100 possessions</caption>
            <thead>
              <tr>
                <th scope="col">Team</th>
                <th scope="col" className={s.right}>
                  Offense
                </th>
                <th scope="col" className={s.right}>
                  Defense
                </th>
                <th scope="col" className={s.right}>
                  Net
                </th>
                <th scope="col" className={s.right}>
                  Luck could move it
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.abbr} className={t.abbr === highlight ? s.currentRow : undefined}>
                  <th scope="row">
                    <TeamCell abbr={t.abbr} name={t.name} current={t.abbr === highlight} />
                  </th>
                  <td className={`num ${s.right}`}>
                    {t.ortg.toFixed(1)}
                    {t.rank.ortg ? <span className={s.cellNote}>{ordinal(t.rank.ortg)}</span> : null}
                  </td>
                  <td className={`num ${s.right}`}>
                    {t.drtg.toFixed(1)}
                    {t.rank.drtg ? <span className={s.cellNote}>{ordinal(t.rank.drtg)}</span> : null}
                  </td>
                  <td className={`num ${s.right} ${s.strong}`}>{signed(t.net)}</td>
                  <td className={`num ${s.right}`}>{t.noise != null ? `±${t.noise.toFixed(1)}` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className={c.legend} aria-hidden="true">
            <span className={c.legendItem}>
              <span className={c.swatchDot} />
              One team
            </span>
            {focus ? (
              <span className={c.legendItem}>
                <span className={s.swatchFocus} />
                {focus.name}
              </span>
            ) : null}
            <span className={c.legendItem}>
              <span className={c.swatchDash} />
              League average
            </span>
            <span className={c.legendItem}>
              <span className={s.swatchDiagonal} />
              Net rating, every 5
            </span>
          </div>
          <TeamQuadrantChart
            teams={teams}
            league={league}
            highlight={highlight}
            summary={`Offense against defense for ${teams.length} teams. Best net rating: ${best.name}, ${signed(best.net)}.${focus ? ` ${focus.name}: ${signed(focus.net)}.` : ''}`}
          />
        </>
      )}
    </ChartFrame>
  );
}

type LuckProps = {
  id?: string;
  title: string;
  meta: string;
  answer: string;
  teams: readonly LuckPoint[];
  noise: number;
  games: number;
  highlight?: string | null;
};

/** "Who's been lucky?" / "Lucky or good?": record against point differential, with the band luck alone produces. */
export function LuckPanel({ id = 'luck', title, meta, answer, teams, noise, games, highlight = null }: LuckProps) {
  const [view, setView] = useQueryParam<View>(id, 'chart', VIEWS);
  const sorted = [...teams].sort((a, b) => b.luck - a.luck);
  const focus = highlight ? teams.find((t) => t.abbr === highlight) : undefined;
  const verdict = (t: LuckPoint) => {
    const band = t.noise ?? noise;
    return t.luck > band ? 'Luckier than normal' : t.luck < -band ? 'Unluckier than normal' : 'Normal luck';
  };
  return (
    <ChartFrame
      id={id}
      title={title}
      meta={meta}
      controls={<ViewToggle view={view} onChange={setView} />}
      answer={<p>{answer}</p>}
      howTo={
        <>
          <p>
            Each dot is a team: its wins minus the wins its point differential usually produces (the Pythagorean
            expectation). Right of center, the record runs ahead of the scoring.
          </p>
          <p>
            Even if every close game were a coin flip, records would wander up to about {noise.toFixed(1)} wins from
            that after {games} games (95%): the shaded band. Only teams outside it have clearly won more or fewer close
            games than their scoring says, and only they are named.
          </p>
        </>
      }>
      {view === 'table' ? (
        <div className={s.tableScroll} tabIndex={0} role="region" aria-label={`${title} as a table`}>
          <table className={s.table}>
            <caption className="visually-hidden">Teams by wins above what their point differential predicts</caption>
            <thead>
              <tr>
                <th scope="col">Team</th>
                <th scope="col" className={s.right}>
                  Record
                </th>
                <th scope="col" className={s.right}>
                  Expected wins
                </th>
                <th scope="col" className={s.right}>
                  Luck
                </th>
                <th scope="col">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.abbr} className={t.abbr === highlight ? s.currentRow : undefined}>
                  <th scope="row">
                    <TeamCell abbr={t.abbr} name={t.name} current={t.abbr === highlight} />
                  </th>
                  <td className={`num ${s.right}`}>{t.record}</td>
                  <td className={`num ${s.right}`}>{t.expected != null ? t.expected.toFixed(1) : '–'}</td>
                  <td className={`num ${s.right} ${s.strong}`}>{signed(t.luck)}</td>
                  <td>{verdict(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className={c.legend} aria-hidden="true">
            <span className={c.legendItem}>
              <span className={c.swatchDot} />
              One team
            </span>
            {focus ? (
              <span className={c.legendItem}>
                <span className={s.swatchFocus} />
                {focus.name}
              </span>
            ) : null}
            <span className={c.legendItem}>
              <span className={c.swatchBand} />
              Normal luck (95%)
            </span>
          </div>
          <LuckStrip
            teams={teams}
            noise={noise}
            highlight={highlight}
            summary={`Wins against point differential for ${teams.length} teams. Normal luck is within ${noise.toFixed(1)} wins. ${answer}`}
          />
        </>
      )}
    </ChartFrame>
  );
}
