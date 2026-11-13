/**
 * Small display pieces with no behavior: avatar, team chip, stat tiles,
 * percentile bar, badge, note, skeleton, empty and error states.
 */
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { teamPath } from '@/lib/routes';
import { teamInfo } from '@/theme/teams';

import { AlertIcon } from './icons';
import s from './ui.module.css';

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

/** "Shai Gilgeous-Alexander" -> "SG"; "Jaren Jackson Jr." -> "JJ". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !SUFFIXES.has(w.replace(/\./g, '').toLowerCase()));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Players are shown as initials: no photos or silhouettes. Decorative next to the name. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span className={s.avatar} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** Abbreviation with the team color as a swatch. Pass `link` to make it a link to the team page. */
export function TeamChip({ abbr, link = false, muted = false }: { abbr: string; link?: boolean; muted?: boolean }) {
  const team = teamInfo(abbr);
  const className = muted ? `${s.chip} ${s.chipMuted}` : s.chip;
  const body = (
    <>
      <span className={s.swatch} style={{ background: team.color }} aria-hidden="true" />
      {abbr}
    </>
  );
  return link ? (
    <Link href={teamPath(abbr)} className={className} aria-label={team.name}>
      {body}
    </Link>
  ) : (
    <span className={className} title={team.name}>
      {body}
    </span>
  );
}

export type Tile = { label: string; value: string; note?: string; href?: string; title?: string };

/** A strip of headline numbers. */
export function StatTiles({ tiles, label, phoneColumns = 3 }: { tiles: readonly Tile[]; label: string; phoneColumns?: 2 | 3 }) {
  return (
    <ul
      className={phoneColumns === 2 ? `${s.tiles} ${s.tilesPair}` : s.tiles}
      style={{ '--tiles': tiles.length } as CSSProperties}
      aria-label={label}>
      {tiles.map((t) => {
        const body = (
          <>
            <span className={`t-eyebrow ${s.tileLabel}`}>
              {t.title ? <abbr title={t.title} style={{ textDecoration: 'none' }}>{t.label}</abbr> : t.label}
            </span>
            <span className={`num ${s.tileValue}`}>{t.value}</span>
            {t.note ? <span className={`t-caption num ${s.tileNote}`}>{t.note}</span> : null}
          </>
        );
        return (
          <li key={t.label} className={s.tile}>
            {t.href ? (
              <Link href={t.href} className={s.tileBody} prefetch={false}>
                {body}
              </Link>
            ) : (
              <div className={s.tileBody}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The five-step cold-to-hot color for "better than X%" (0-100). */
export function percentileColor(better: number): string {
  const step = Math.min(5, Math.max(1, Math.floor(better / 20) + 1));
  return `var(--viz-pct-${step})`;
}

/**
 * "Better than X%" as a bar. Length carries the value; color only repeats
 * it. Neutral stats (roles) show a dot on a line; `null` shows an empty track.
 */
export function PercentileBar({ value, neutral = false }: { value: number | null; neutral?: boolean }) {
  if (value == null) return <span className={`${s.bar} ${s.barEmpty}`} aria-hidden="true" />;
  if (neutral) {
    return (
      <span className={`${s.bar} ${s.barNeutral}`} aria-hidden="true">
        <span className={s.barDot} style={{ left: `${value}%` }} />
      </span>
    );
  }
  return (
    <span className={s.bar} aria-hidden="true">
      <span className={s.barFill} style={{ width: `${value}%`, background: percentileColor(value) }} />
    </span>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className={s.badge}>{children}</span>;
}

/** A short, calm notice inside the page flow (small samples, early season). */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className={`t-body-sm ${s.note}`}>
      <AlertIcon />
      <span>{children}</span>
    </p>
  );
}

/** A placeholder shaped like what is loading. */
export function Skeleton({ height, width = '100%', radius }: { height: number | string; width?: number | string; radius?: string }) {
  return <span className={s.skeleton} style={{ height, width, borderRadius: radius }} aria-hidden="true" />;
}

/** Nothing to show, said plainly, with a way forward. */
export function EmptyState({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={s.state}>
      <p className={s.stateTitle}>{title}</p>
      {children ? <p className={`t-body-sm ${s.stateBody}`}>{children}</p> : null}
      {actions ? <div className={s.stateActions}>{actions}</div> : null}
    </div>
  );
}

/** Something failed: what happened and what to do next. Icon plus words, never color alone. */
export function ErrorState({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={`${s.state} ${s.stateError}`} role="alert">
      <p className={s.stateTitle}>
        <AlertIcon />
        {title}
      </p>
      {children ? <p className={`t-body-sm ${s.stateBody}`}>{children}</p> : null}
      {actions ? <div className={s.stateActions}>{actions}</div> : null}
    </div>
  );
}
