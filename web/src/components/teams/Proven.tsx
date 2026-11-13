import Link from 'next/link';

import { teamPath } from '@/lib/routes';
import { netVerdict, type Verdict } from '@/teams/analysis';
import { teamInfo } from '@/theme/teams';

import { signed, type RatedTeam } from './answers';
import s from './teams.module.css';

const GROUPS: { verdict: Verdict; title: string }[] = [
  { verdict: 'above', title: 'Clearly better than average' },
  { verdict: 'unclear', title: 'Too early to tell' },
  { verdict: 'below', title: 'Clearly worse than average' },
];

/**
 * "Which teams have proven it?" Every team sorted by whether its net rating
 * clears game-to-game luck: the same test as the chart's answer, for all 30.
 */
export function Proven({ teams, noise, games }: { teams: readonly RatedTeam[]; noise: number | null; games: number }) {
  const sorted = [...teams].sort((a, b) => b.net - a.net);
  return (
    <section className={s.panel} aria-labelledby="proven-title">
      <header className={s.panelHead}>
        <h2 id="proven-title" className="t-card-title">
          Which teams have proven it?
        </h2>
        <p className="t-caption t-subtle">
          Net rating clear of game-to-game luck (95%)
          {noise != null ? ` · about ±${noise.toFixed(1)} after ${games} games` : ''}
        </p>
      </header>
      {GROUPS.map(({ verdict, title }) => {
        const group = sorted.filter((t) => netVerdict(t) === verdict);
        return (
          <div key={verdict} className={s.provenGroup}>
            <h3 className={`t-eyebrow ${s.provenTitle}`}>
              {title} <span className="num">({group.length})</span>
            </h3>
            {group.length ? (
              <ul className={s.provenList}>
                {group.map((t) => (
                  <li key={t.abbr}>
                    <Link href={teamPath(t.abbr)} className={s.provenTeam} title={teamInfo(t.abbr).name} prefetch={false}>
                      <span className={s.provenSwatch} style={{ background: teamInfo(t.abbr).color }} aria-hidden="true" />
                      {t.abbr}
                      <span className="visually-hidden"> ({teamInfo(t.abbr).name}), net rating</span>
                      <span className={`num ${s.provenNet}`}>{signed(t.net)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-body-sm t-subtle">None yet.</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
