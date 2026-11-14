/**
 * Share previews (Open Graph images), drawn at build time with next/og, which
 * ships inside Next (no extra dependency). Each image is a 1200 x 630 PNG
 * written next to its page by the static export.
 *
 * next/og cannot read CSS variables, so the colors are read from
 * styles/tokens.css at build time: the token file stays the one source.
 * Inter (SIL Open Font License 1.1, fonts/OFL.txt) is bundled as WOFF because
 * the image renderer cannot read the WOFF2 the pages use.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';
import type { ReactElement, ReactNode } from 'react';

import { formatDate } from '@/lib/format';
import { OG_SIZE } from '@/lib/meta';
import { SITE } from '@/lib/site';



const ROOT = process.cwd();

function tokens(): Record<string, string> {
  const css = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  const out: Record<string, string> = {};
  for (const m of root.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2];
  return out;
}

const T = tokens();

/** A token's hex value; throws at build time if the token is gone, so a renamed token never ships a blank. */
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

let fonts: { name: string; data: Buffer; weight: 400 | 600; style: 'normal' }[] | null = null;
function loadFonts() {
  fonts ??= ([400, 600] as const).map((weight) => ({
    name: 'Inter',
    data: readFileSync(join(ROOT, `src/og/fonts/inter-${weight}.woff`)),
    weight,
    style: 'normal' as const,
  }));
  return fonts;
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="12" cy="8" r="5" stroke={tok('accent')} strokeWidth="2.5" />
      <rect x="3" y="16" width="14" height="2.5" rx="1.25" fill={tok('accent')} />
    </svg>
  );
}

/**
 * The frame every preview shares: brand at top left, the games-through date
 * at top right, a question as the title, then the card's own content.
 */
export function Frame({
  eyebrow,
  title,
  through,
  children,
  titleSize = 76,
}: {
  eyebrow?: string;
  title: string;
  through: string;
  children?: ReactNode;
  titleSize?: number;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: tok('canvas'),
        color: tok('ink'),
        fontFamily: 'Inter',
        padding: '56px 72px 64px',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Mark size={34} />
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.4 }}>{SITE.name}</span>
        </div>
        <span style={{ fontSize: 24, color: tok('ink-subtle') }}>Games through {formatDate(through)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', gap: 18 }}>
        {eyebrow ? (
          <span style={{ fontSize: 26, color: tok('ink-subtle'), letterSpacing: 0.4, textTransform: 'uppercase' }}>
            {eyebrow}
          </span>
        ) : null}
        <span
          style={{
            fontSize: titleSize,
            fontWeight: 600,
            letterSpacing: -titleSize / 40,
            lineHeight: 1.05,
            maxWidth: 1056,
          }}>
          {title}
        </span>
      </div>
      {children ? <div style={{ display: 'flex', marginTop: 40 }}>{children}</div> : null}
    </div>
  );
}

/** A percentile ring as on the player card: surface fill, colored ring, ink number. Neutral or unranked: a gray ring. */
export function Ring({ better, label, value }: { better: number | null; label: string; value: string }) {
  const size = 112;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const shown = better == null ? 0 : Math.max(2, Math.min(100, better));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 176 }}>
      <div style={{ display: 'flex', position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill={tok('surface-2')} stroke={tok('viz-track')} strokeWidth={stroke} />
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
            fontSize: 38,
            fontWeight: 600,
          }}>
          {better == null ? '–' : String(Math.round(better))}
        </span>
      </div>
      <span style={{ fontSize: 22, color: tok('ink-muted') }}>{label}</span>
      <span style={{ fontSize: 22, color: tok('ink-subtle') }}>{value}</span>
    </div>
  );
}

/** The frame must be the root element (not wrapped in a fragment) so it fills the whole image. */
export function render(node: ReactElement): ImageResponse {
  return new ImageResponse(node, { ...OG_SIZE, fonts: loadFonts() });
}
