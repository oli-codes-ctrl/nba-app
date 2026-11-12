'use client';

import { useMemo, useState } from 'react';

import s from '@/charts/charts.module.css';
import { TrendChart } from '@/charts/TrendChart';
import { Button } from '@/components/Button';
import { ChartFrame } from '@/components/ChartFrame';
import { ChartIcon, TableIcon } from '@/components/icons';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { GameStatKey } from '@/data/types';
import { gameLine, heat, HEAT_Z, mean, trailing, type GameLog } from '@/games/logs';
import { formatDate } from '@/lib/format';
import { useQueryParam } from '@/lib/useQueryParam';

import p from './player.module.css';

const STATS: readonly { id: GameStatKey; label: string; name: string }[] = [
  { id: 'gmsc', label: 'GmSc', name: 'Game Score' },
  { id: 'pts', label: 'PTS', name: 'points' },
  { id: 'reb', label: 'REB', name: 'rebounds' },
  { id: 'ast', label: 'AST', name: 'assists' },
  { id: 'fg3m', label: '3PM', name: 'threes' },
];
const STAT_IDS = STATS.map((x) => x.id);
const VIEWS = ['chart', 'table'] as const;
const WINDOW = 10;

function capital(text: string): string {
  return text[0].toUpperCase() + text.slice(1);
}

type Props = {
  log: readonly GameLog[];
  /** "L. Doncic" */
  name: string;
  /** Formatted date of the latest box scores. */
  through: string;
};

/**
 * "Is he heating up?" Game by game from the box scores. The verdict only
 * calls a streak when it beats game-to-game luck. The stat and the table
 * view live in the URL (`?trend=pts&log=table`).
 */
export function GameTrend({ log, name, through }: Props) {
  const [stat, setStat] = useQueryParam<GameStatKey>('trend', 'gmsc', STAT_IDS);
  const [view, setView] = useQueryParam<(typeof VIEWS)[number]>('log', 'chart', VIEWS);
  const [picked, setPicked] = useState<number | null>(null);

  const def = STATS.find((x) => x.id === stat)!;
  const values = useMemo(() => log.map((g) => g.v[stat]), [log, stat]);
  const trail = useMemo(() => trailing(values, WINDOW), [values]);
  const season = mean(values);
  const recentGames = log.length >= 10 ? 5 : 3;
  const h = heat(values, recentGames);
  const last = log.length - 1;
  const shown = picked != null && picked < log.length ? picked : last;
  const game = log[shown];
  const digits = stat === 'gmsc' ? 1 : 0;

  const answer = !h
    ? `Only ${log.length} ${log.length === 1 ? 'game' : 'games'} so far: too few to tell a streak from luck.`
    : h.z >= HEAT_Z
      ? `Heating up: ${h.recent.toFixed(1)} ${def.name} a game over his last ${h.recentGames}, up from ${h.before.toFixed(1)} before. That’s more than game-to-game luck explains.`
      : h.z <= -HEAT_Z
        ? `Cooling off: ${h.recent.toFixed(1)} ${def.name} a game over his last ${h.recentGames}, down from ${h.before.toFixed(1)} before. That’s more than game-to-game luck explains.`
        : `Steady: his last ${h.recentGames} games (${h.recent.toFixed(1)}) are within normal swings of his ${h.beforeGames} before (${h.before.toFixed(1)}).`;

  return (
    <ChartFrame
      id="trend"
      title="Is he heating up?"
      meta={`${capital(def.name)} game by game · ${log.length} ${log.length === 1 ? 'game' : 'games'} · box scores through ${through}`}
      controls={
        <>
          <SegmentedControl
            compact
            label="Stat"
            options={STATS.map((x) => ({ id: x.id, label: x.label }))}
            value={stat}
            onChange={setStat}
          />
          <Button
            variant="tertiary"
            aria-pressed={view === 'table'}
            icon={view === 'table' ? <ChartIcon /> : <TableIcon />}
            onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
            {view === 'table' ? 'Chart' : 'Table'}
          </Button>
        </>
      }
      answer={<p>{answer}</p>}
      howTo={
        <>
          <p>
            Each dot is one game; select a dot (or use the arrow keys) for its box line. The line is his average over
            the last {WINDOW} games, fewer early on.
          </p>
          <p>
            The shaded band is where his true level over those games likely sits (95%), using his game-to-game spread
            for the whole season. The dashed line is his season average of {season.toFixed(1)}.
          </p>
          <p>
            A streak is only called when his recent games differ from his earlier ones by {HEAT_Z} standard errors,
            because hundreds of players are checked at once.
          </p>
        </>
      }>
      {view === 'table' ? (
        <div className={p.logScroll} tabIndex={0} role="region" aria-label={`${name} game log`}>
          <table className={`${p.table} ${p.logTable}`}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Opp</th>
                <th scope="col">Result</th>
                <th scope="col" className={p.right}>MIN</th>
                <th scope="col" className={p.right}>PTS</th>
                <th scope="col" className={p.right}>REB</th>
                <th scope="col" className={p.right}>AST</th>
                <th scope="col" className={p.right}>3PM</th>
                <th scope="col" className={p.right}>GmSc</th>
              </tr>
            </thead>
            <tbody>
              {[...log].reverse().map((g) => (
                <tr key={g.id}>
                  <th scope="row" className="num">
                    {formatDate(g.date).replace(/, \d{4}$/, '')}
                  </th>
                  <td>
                    {g.home ? 'vs' : 'at'} {g.opp}
                  </td>
                  <td className="num">
                    {g.won ? 'W' : 'L'} {g.teamPts}–{g.oppPts}
                  </td>
                  <td className={`num ${p.right}`}>{g.v.min}</td>
                  <td className={`num ${p.right}`}>{g.v.pts}</td>
                  <td className={`num ${p.right}`}>{g.v.reb}</td>
                  <td className={`num ${p.right}`}>{g.v.ast}</td>
                  <td className={`num ${p.right}`}>{g.v.fg3m}</td>
                  <td className={`num ${p.right}`}>{g.v.gmsc.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className={s.legend} aria-hidden="true">
            <span className={s.legendItem}>
              <span className={s.swatchDot} />
              One game
            </span>
            <span className={s.legendItem}>
              <span className={s.swatchLine} />
              Average of last {WINDOW}
            </span>
            <span className={s.legendItem}>
              <span className={s.swatchBand} />
              Likely true level
            </span>
            <span className={s.legendItem}>
              <span className={s.swatchDash} />
              Season average
            </span>
          </div>
          <TrendChart
            values={values}
            dates={log.map((g) => g.date)}
            trailing={trail}
            seasonMean={season}
            selected={shown}
            onSelect={setPicked}
            summary={`${name}: ${def.name} in each of ${log.length} games. Season average ${season.toFixed(1)}. ${answer}`}
            tooltip={(i) => (
              <>
                <div className={s.tipTitle}>
                  {formatDate(log[i].date).replace(/, \d{4}$/, '')} · {log[i].home ? 'vs' : 'at'} {log[i].opp}
                </div>
                <div className={s.tipValue}>
                  {values[i].toFixed(digits)} {def.label}
                </div>
                <div className={s.tipRow}>
                  <span>Avg of last {trail[i].n}</span>
                  <span>{trail[i].mean.toFixed(1)}</span>
                </div>
              </>
            )}
          />
          <div className={p.game} aria-live="polite">
            <p className="t-caption t-subtle num">
              {formatDate(game.date)} · {game.home ? 'vs' : 'at'} {game.opp} · {game.won ? 'W' : 'L'} {game.teamPts}–
              {game.oppPts}
              {shown === last ? ' · latest game' : ''}
            </p>
            <p className={`num ${p.gameLine}`}>{gameLine(game.v)}</p>
            <p className="t-caption t-subtle num">
              {game.v.fgm}-{game.v.fga} FG · {game.v.fg3m}-{game.v.fg3a} 3PT · {game.v.ftm}-{game.v.fta} FT ·{' '}
              {game.v.min} min · Game Score {game.v.gmsc.toFixed(1)} · {game.v.pm > 0 ? '+' : ''}
              {game.v.pm}
            </p>
          </div>
        </>
      )}
    </ChartFrame>
  );
}
