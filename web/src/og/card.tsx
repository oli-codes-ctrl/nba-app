/**
 * Share previews (Open Graph images), drawn at build time with next/og, which
 * ships inside Next (no extra dependency). Each image is a 1200 x 630 PNG.
 *
 * next/og cannot read CSS variables, so colors (and the card field's tint)
 * are read from styles/tokens.css at build time: the token file stays the one
 * source. It cannot use variable fonts either, so Archivo is bundled as four
 * static WOFF instances cut from the variable font (fonts/, SIL Open Font
 * License 1.1): text 400 and 600 at normal width, display 780 at 75% width,
 * score figures 800 at 68%.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';
import type { ReactElement, ReactNode } from 'react';

import { formatDate } from '@/lib/format';
import { OG_SIZE } from '@/lib/meta';
import { SITE } from '@/lib/site';

const ROOT = process.cwd();
const CSS = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');
const ROOT_BLOCK = CSS.slice(CSS.indexOf(':root'), CSS.indexOf('}', CSS.indexOf(':root')));
const T: Record<string, string> = Object.fromEntries(
  [...ROOT_BLOCK.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6}|\d+%)\s*;/g)].map((m) => [m[1], m[2]]),
);

/** A token's value; throws at build time if the token is gone, so a renamed token never ships a blank. */
export function tok(name: string): string {
  const v = T[name];
  if (!v) throw new Error(`Share image: token --${name} not found in styles/tokens.css`);
  return v;
}

/** The five-step cold-to-hot color for "better than X%", as primitives.percentileColor. */
export function pctColor(better: number): string {
  const step = Math.min(5, Math.max(1, Math.floor(better / 20) + 1));
  return tok(`viz-pct-${step}`);
}

/** CSS `color-mix(in srgb, a t, b)`, for the renderer that has no color-mix. */
function mix(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(a, i) * t + ch(b, i) * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
}
const share = (name: string) => Number.parseFloat(tok(name)) / 100;

type Font = { name: string; data: Buffer; weight: 400 | 600 | 800; style: 'normal' };
let fonts: Font[] | null = null;
function loadFonts(): Font[] {
  const file = (name: string) => readFileSync(join(ROOT, `src/og/fonts/${name}.woff`));
  fonts ??= [
    { name: 'Archivo', data: file('archivo-400'), weight: 400, style: 'normal' },
    { name: 'Archivo', data: file('archivo-600'), weight: 600, style: 'normal' },
    { name: 'Archivo Display', data: file('archivo-display-780'), weight: 800, style: 'normal' },
    { name: 'Archivo Score', data: file('archivo-score-800'), weight: 800, style: 'normal' },
  ];
  return fonts;
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="12" cy="8" r="5" stroke={tok('ink')} strokeWidth="2.5" />
      <rect x="3" y="16" width="14" height="2.5" rx="1.25" fill={tok('ink')} />
    </svg>
  );
}

/** Half a court in feet, baseline on the right, as on the page card (components/CourtLines.tsx). */
function Court({ color, height }: { color: string; height: number }) {
  const hoop = 47 - 5.25;
  const cornerX = hoop - Math.sqrt(23.75 ** 2 - 22 ** 2);
  const sw = 0.12;
  return (
    <svg width={(height * 47) / 50} height={height} viewBox="0 0 47 50" fill="none" stroke={color} strokeWidth={sw}>
      <rect x="28" y="17" width="19" height="16" />
      <circle cx="28" cy="25" r="6" />
      <path d={`M47 3 H${cornerX} A23.75 23.75 0 0 0 ${cornerX} 47 H47`} />
      <path d={`M${hoop} 21 A4 4 0 0 0 ${hoop} 29`} />
      <line x1="43" y1="22" x2="43" y2="28" />
      <circle cx={hoop} cy="25" r="0.75" />
    </svg>
  );
}

/**
 * The frame every preview shares: brand and the games-through date on top, a
 * line of context, the title set in the condensed display face, then the
 * card's own content. With `team` (a display color) the frame becomes the
 * card field: tinted, with the team band on top and the court drawn in it.
 */
export function Frame({
  eyebrow,
  title,
  through,
  children,
  titleSize = 84,
  team,
}: {
  eyebrow?: string;
  title: string;
  through: string;
  children?: ReactNode;
  titleSize?: number;
  team?: string;
}) {
  const base = tok('canvas');
  const background = team
    ? `linear-gradient(90deg, ${mix(team, base, share('team-tint-text'))} 0%, ${mix(team, base, share('team-tint-text'))} 50%, ${mix(team, base, share('team-tint-court'))} 100%)`
    : base;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: base,
        color: tok('ink'),
        fontFamily: 'Archivo',
        padding: '56px 72px 60px',
        // The renderer rejects style keys set to undefined, so the field's keys are added only with a team.
        ...(team ? { backgroundImage: background, borderTop: `10px solid ${team}` } : {}),
      }}>
      {team ? (
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex' }}>
          <Court color={mix(team, base, 0.34)} height={620} />
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Mark size={34} />
          <span style={{ fontSize: 28, fontWeight: 600 }}>{SITE.name}</span>
        </div>
        <span style={{ fontSize: 24, color: tok('ink-muted') }}>Games through {formatDate(through)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', gap: 14 }}>
        {eyebrow ? <span style={{ fontSize: 28, color: tok('ink-muted') }}>{eyebrow}</span> : null}
        <span
          style={{
            fontFamily: 'Archivo Display',
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1,
            maxWidth: 1056,
          }}>
          {title}
        </span>
      </div>
      {children ? <div style={{ display: 'flex', marginTop: 36 }}>{children}</div> : null}
    </div>
  );
}

/** A percentile ring as on the player card: surface fill, colored arc, the number in the score face. */
export function Ring({ better, label, value }: { better: number | null; label: string; value: string }) {
  const size = 112;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const shown = better == null ? 0 : Math.max(2, Math.min(100, better));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 176 }}>
      <div style={{ display: 'flex', position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill={tok('surface-1')} stroke={tok('viz-track')} strokeWidth={stroke} />
          {better != null ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={pctColor(better)}
              strokeWidth={stroke}
              strokeDasharray={`${(shown / 100) * c} ${c}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="round"
            />
          ) : null}
        </svg>
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Archivo Score',
            fontSize: 44,
            fontWeight: 800,
          }}>
          {better == null ? '–' : String(Math.round(better))}
        </span>
      </div>
      <span style={{ fontSize: 23, color: tok('ink-muted') }}>{label}</span>
      <span style={{ fontSize: 23, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/** The frame must be the root element (not wrapped in a fragment) so it fills the whole image. */
export function render(node: ReactElement): ImageResponse {
  return new ImageResponse(node, { ...OG_SIZE, fonts: loadFonts() });
}
