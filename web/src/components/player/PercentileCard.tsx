import Link from 'next/link';
import type { CSSProperties } from 'react';

import { ChartFrame } from '@/components/ChartFrame';
import { percentileColor } from '@/components/primitives';
import { betterPct, formatStat, ordinal } from '@/lib/format';
import { statPath, type Pool } from '@/lib/routes';
import { CARD_SECTIONS, ELITE, type CardInsights, type CardRow } from '@/players/card';

import s from './player.module.css';

const LIST = 4;

type Props = {
  id: string;
  title: string;
  /** Who he is compared with, e.g. "132 qualified guards". */
  poolText: string;
  through: string;
  rows: readonly CardRow[];
  insights: CardInsights;
  playerId: number;
  pool: Pool;
};

/**
 * Savant-style percentile card. Each stat is a ring at his percentile on a
 * 0-100 line (right is better), colored cold to hot, with the number inside
 * so color is never the only signal. The bar under a ring is where his rank
 * could sit allowing for luck. Roles (usage) get a gray ring: more is
 * neither good nor bad. Every row links to that stat across the league.
 */
export function PercentileCard({ id, title, poolText, through, rows, insights, playerId, pool }: Props) {
  const byStat = new Map(rows.map((r) => [r.stat, r]));
  return (
    <ChartFrame
      id={id}
      title={title}
      meta={`Percentiles among ${poolText} · games through ${through}`}
      answer={<Answer insights={insights} />}
      howTo={
        <>
          <p>
            Each ring sits at his percentile: 100 is best, 50 is the middle of the group. For turnovers, fewer counts
            as better.
          </p>
          <p>
            The bar under a ring is where his rank could sit once luck is allowed for (95% range). A short bar means
            the rank is settled; no bar means no range is published for that stat yet.
          </p>
          <p>
            Elite means top {100 - ELITE}% even at the unlucky end of his range. Weak spot means bottom {100 - ELITE}%
            even at the lucky end. Not settled means top or bottom 10% so far, but luck can’t be ruled out yet.
          </p>
          <p>Usage is a role, not a quality, so it gets no color. Select any stat to see every player.</p>
        </>
      }>
      <div className={s.cardBody}>
        <div className={s.key} role="img" aria-label="Ring: his percentile. Bar under it: where his rank could sit, allowing for luck.">
          <span className={s.keyItem}>
            <span className={s.keyRing} />
            His percentile
          </span>
          <span className={s.keyItem}>
            <span className={s.keyBar} />
            Where it could be, allowing for luck (95%)
          </span>
        </div>

        <div className={s.scale} aria-hidden="true">
          <span />
          <span className={s.scaleTicks}>
            <span style={{ left: '0%' }}>0</span>
            <span style={{ left: '50%' }}>50</span>
            <span style={{ left: '100%' }}>100</span>
          </span>
          <span />
        </div>

        {CARD_SECTIONS.map((section) => (
          <div key={section.title} className={s.cardSection}>
            <h3 className={`t-eyebrow ${s.cardKicker}`}>{section.title}</h3>
            <ul>
              {section.rows.map(({ stat }) => {
                const row = byStat.get(stat);
                return row ? (
                  <li key={stat}>
                    <Row row={row} href={statPath(stat, { player: playerId, pos: pool })} />
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}

function names(rows: readonly CardRow[]): string {
  return rows
    .slice(0, LIST)
    .map((r) => r.label)
    .join(', ');
}

/** The answer first: what the ranges let us say for sure. */
function Answer({ insights }: { insights: CardInsights }) {
  const { elite, weak, unsettled } = insights;
  const lines: { kicker: string; text: string }[] = [];
  if (elite.length) lines.push({ kicker: 'Elite', text: names(elite) });
  if (weak.length) lines.push({ kicker: 'Weak spot', text: names(weak) });
  if (unsettled.length) {
    lines.push({
      kicker: 'Not settled',
      text: unsettled
        .slice(0, LIST)
        .map((r) => `${r.label} (${ordinal(Math.round(r.better ?? 0))})`)
        .join(', '),
    });
  }
  return (
    <div className={s.answer}>
      {!elite.length && !weak.length ? <p>Nothing is clearly elite or weak yet, allowing for luck.</p> : null}
      {lines.length > 0 && (
        <dl className={s.answerList}>
          {lines.map((l) => (
            <div key={l.kicker} className={s.answerLine}>
              <dt className="t-eyebrow">{l.kicker}</dt>
              <dd>{l.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function Row({ row, href }: { row: CardRow; href: string }) {
  const ranked = row.better != null;
  const color = row.neutral || !ranked ? 'var(--viz-mark)' : percentileColor(row.better!);
  const spoken =
    `${row.label}: ${formatStat(row.stat, row.value)}` +
    (ranked
      ? `, ${row.neutral ? 'higher' : 'better'} than ${betterPct(row.better!)} percent` +
        (row.band
          ? `; allowing for luck, between the ${ordinal(Math.round(row.band[0]))} and ${ordinal(Math.round(row.band[1]))} percentile`
          : '')
      : ', not ranked yet') +
    '. See every player.';

  return (
    <Link href={href} className={s.row} aria-label={spoken} prefetch={false}>
      <span className={s.rowLabel}>{row.label}</span>
      <span className={s.track} style={{ '--mark': color } as CSSProperties}>
        <span className={s.trackLine} />
        <span className={s.trackInner}>
          <span className={s.trackMid} />
          {/* The range sits under the ring, so a settled (short) one still shows as a dash. */}
          {ranked && row.band ? (
            <span
              className={s.band}
              style={{ left: `${row.band[0]}%`, width: `${Math.max(0, row.band[1] - row.band[0])}%` }}
            />
          ) : null}
          {ranked ? (
            <span className={`num ${s.ring}`} style={{ left: `${row.better}%` }}>
              {Math.round(row.better!)}
            </span>
          ) : null}
        </span>
        {!ranked ? <span className={`t-caption ${s.unranked}`}>Not ranked yet</span> : null}
      </span>
      <span className={`num ${s.rowValue}`}>{formatStat(row.stat, row.value)}</span>
    </Link>
  );
}
