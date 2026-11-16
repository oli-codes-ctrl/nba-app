import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

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
  /** Replaces the default answer (the insights), e.g. when the page header already gives the verdict. */
  answer?: ReactNode;
};

/**
 * Savant-style percentile card. Each stat is a ring at his percentile on a
 * 0-100 line (right is better), colored cold to hot, with the number inside
 * so color is never the only signal. The bar under a ring is where his rank
 * could sit allowing for luck. Roles (usage) get a gray ring: more is
 * neither good nor bad. Every row links to that stat across the league.
 */
export function PercentileCard({ id, title, poolText, through, rows, insights, playerId, pool, answer }: Props) {
  const byStat = new Map(rows.map((r) => [r.stat, r]));
  return (
    <ChartFrame
      id={id}
      title={title}
      meta={through ? `Percentiles among ${poolText}, games through ${through}` : `Percentiles among ${poolText}`}
      answer={answer ?? <Answer insights={insights} />}
      howTo={
        <>
          <p>
            Each bar fills to his percentile: the share of the group he ranks above, so a full bar is the best and the
            notch is the middle. For turnovers, fewer counts as better.
          </p>
          <p>
            The lighter stretch over a bar is where his rank could sit once luck is allowed for (95% range). A short
            stretch means the rank is settled; none means no range is published for that stat yet.
          </p>
          <p>
            Elite means top {100 - ELITE}% even at the unlucky end of his range. Weak spot means bottom {100 - ELITE}%
            even at the lucky end. Not settled means top or bottom 10% so far, but luck can’t be ruled out yet.
          </p>
          <p>Usage is a role, not a quality, so it gets no color. Select any stat to see every player.</p>
        </>
      }>
      <div className={s.cardBody}>
        <div className={s.key} role="img" aria-label="Bar: his percentile, right is better. Lighter stretch: where luck could still put him.">
          <span className={s.keyItem}>
            <span className={s.keyFill} />
            His percentile (right is better)
          </span>
          <span className={s.keyItem}>
            <span className={s.keyRange} />
            Where luck could still put him
          </span>
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

/**
 * The card's rows alone, as a picture of the product (the home page hero):
 * no headings and no links, since the panel around them is one link.
 */
export function CardPreview({ rows }: { rows: readonly CardRow[] }) {
  return (
    <div className={s.cardBody}>
      <ul>
        {rows.map((row) => (
          <li key={row.stat}>
            <Row row={row} />
          </li>
        ))}
      </ul>
    </div>
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

/**
 * One stat as one bar: filled to his percentile (cold to hot), with the
 * percentile in words beside it. A lighter stretch over the bar is where
 * luck could still put him; roles (usage) get a grey dot instead of a fill.
 */
function Row({ row, href }: { row: CardRow; href?: string }) {
  const ranked = row.better != null;
  const color = row.neutral || !ranked ? 'var(--viz-mark)' : percentileColor(row.better!);
  const spoken =
    `${row.label}: ${formatStat(row.stat, row.value)}` +
    (ranked
      ? `, ${row.neutral ? 'higher' : 'better'} than ${betterPct(row.better!)} percent` +
        (row.band
          ? `; allowing for luck, between the ${ordinal(betterPct(row.band[0]))} and ${ordinal(betterPct(row.band[1]))} percentile`
          : '')
      : ', not ranked yet') +
    '. See every player.';

  const body = (
    <>
      <span className={s.rowLabel}>{row.label}</span>
      <span className={s.bar} style={{ '--mark': color } as CSSProperties} aria-hidden="true">
        <span className={s.barMid} />
        {ranked && !row.neutral ? <span className={s.barFill} style={{ width: `${Math.max(1, row.better!)}%` }} /> : null}
        {ranked && row.neutral ? <span className={s.barDot} style={{ left: `${row.better}%` }} /> : null}
        {ranked && row.band ? (
          <span
            className={s.barRange}
            style={{ left: `${row.band[0]}%`, width: `${Math.max(1, row.band[1] - row.band[0])}%` }}
          />
        ) : null}
      </span>
      <span className={`num ${s.rowPct}`} aria-hidden="true">
        {/* Words stop at 99th, as every sentence does: no one beats himself. */}
        {ranked ? ordinal(betterPct(row.better!)) : '–'}
      </span>
      <span className={`num ${s.rowValue}`} aria-hidden="true">
        {formatStat(row.stat, row.value)}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={`${s.row} ${s.rowLink}`} aria-label={spoken} prefetch={false}>
      {body}
    </Link>
  ) : (
    <span className={s.row} aria-label={spoken} role="img">
      {body}
    </span>
  );
}
