import type { CSSProperties } from 'react';

import { ChartFrame } from '@/components/ChartFrame';
import { percentileColor } from '@/components/primitives';
import { ordinal } from '@/lib/format';
import type { FactorRow } from '@/teams/analysis';

import s from './teams.module.css';

const Z_CAP = 2.5;

function show(row: FactorRow, v: number): string {
  return row.unit === 'percent' ? `${v.toFixed(1)}%` : v.toFixed(1);
}

type Props = {
  name: string;
  sides: { side: 'Offense' | 'Defense'; rows: FactorRow[] }[];
  teams: number;
  through: string;
};

/**
 * "Where do they win and lose?" Dean Oliver's four factors on each end, each
 * a bar from the league average: right is better, and the length is how far
 * it sits from average compared with the other teams. Color repeats the rank
 * (cold to hot); the number and rank are always written beside it.
 */
export function FourFactors({ name, sides, teams, through }: Props) {
  const all = sides.flatMap((x) => x.rows.map((r) => ({ ...r, side: x.side })));
  const best = [...all].sort((a, b) => b.z - a.z)[0];
  const worst = [...all].sort((a, b) => a.z - b.z)[0];
  return (
    <ChartFrame
      id="factors"
      title="Where do they win and lose?"
      meta={`The four factors on each end, against the league · games through ${through}`}
      answer={
        best && worst ? (
          <dl className={s.factorAnswer}>
            <div>
              <dt className="t-eyebrow">Strongest</dt>
              <dd>
                {best.label} ({best.side.toLowerCase()}): {show(best, best.value)}
                {best.rank ? `, ${ordinal(best.rank)} of ${teams}` : ''}
              </dd>
            </div>
            <div>
              <dt className="t-eyebrow">Weakest</dt>
              <dd>
                {worst.label} ({worst.side.toLowerCase()}): {show(worst, worst.value)}
                {worst.rank ? `, ${ordinal(worst.rank)} of ${teams}` : ''}
              </dd>
            </div>
          </dl>
        ) : null
      }
      howTo={
        <>
          <p>
            Dean Oliver’s four factors decide most games: shooting (about 40%), turnovers (25%), offensive rebounds
            (20%) and free throws (15%), on offense and again on defense.
          </p>
          <p>
            Each bar starts at the league average. Right is better, even where fewer is better (turnovers, opponents’
            shooting); its length is the distance from average in standard deviations across the {teams} teams,
            drawn up to 2.5. The color follows the rank, cold to hot.
          </p>
        </>
      }>
      <div className={s.factors}>
        {sides.map(({ side, rows }) => (
          <div key={side} className={s.factorSide}>
            <h3 className={`t-eyebrow ${s.factorTitle}`}>{side}</h3>
            <ul className={s.factorList}>
              {rows.map((r) => {
                const better = r.rank == null ? 50 : ((teams - r.rank) / Math.max(1, teams - 1)) * 100;
                const share = (Math.abs(r.z) / Z_CAP) * 50;
                const verdict = Math.abs(r.z) < 0.25 ? 'about average' : r.z > 0 ? 'better than average' : 'worse than average';
                return (
                  <li key={r.id} className={s.factor}>
                    <span className={s.factorLabel}>
                      {r.label}
                      <span className="visually-hidden">
                        {' '}
                        for {name}: {show(r, r.value)}, league {show(r, r.league)}
                        {r.rank ? `, ${ordinal(r.rank)} of ${teams}` : ''}, {verdict}.
                      </span>
                    </span>
                    <span className={`num ${s.factorValue}`} aria-hidden="true">
                      {show(r, r.value)}
                    </span>
                    <span className={`num t-caption ${s.factorRank}`} aria-hidden="true">
                      {r.rank ? ordinal(r.rank) : ''}
                    </span>
                    <span className={s.factorTrack} aria-hidden="true">
                      <span className={s.factorLine} />
                      <span
                        className={s.factorBar}
                        style={
                          {
                            width: `${share}%`,
                            background: percentileColor(better),
                            ...(r.z >= 0 ? { left: '50%' } : { right: '50%' }),
                          } as CSSProperties
                        }
                      />
                      <span className={s.factorMid} />
                    </span>
                    <span className={`num t-caption ${s.factorLeague}`} aria-hidden="true">
                      League {show(r, r.league)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}
