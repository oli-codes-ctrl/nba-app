/**
 * The site icon: the brand mark (a percentile ring over its range bar) on a
 * rounded canvas tile, so it reads on light and dark browser tabs alike.
 * Colors come from styles/tokens.css through `tok`.
 */
import { tok } from './card';

/** The icon as SVG markup, for /icons/icon.svg. */
export function iconSvg(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">',
    `<rect width="32" height="32" rx="7" fill="${tok('canvas')}"/>`,
    `<rect x="0.5" y="0.5" width="31" height="31" rx="6.5" fill="none" stroke="${tok('hairline-strong')}"/>`,
    `<circle cx="18.2" cy="13" r="6" fill="none" stroke="${tok('accent-text')}" stroke-width="3"/>`,
    `<rect x="7" y="22.4" width="18" height="3.2" rx="1.6" fill="${tok('accent-text')}"/>`,
    '</svg>',
  ].join('');
}

/** The same icon at any size, as an element for next/og. `bleed` fills the square (apple touch and maskable icons). */
export function IconImage({ size, bleed = false }: { size: number; bleed?: boolean }) {
  const pad = bleed ? size * 0.2 : 0;
  const inner = size - pad * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bleed ? tok('canvas') : 'transparent',
      }}>
      <svg width={inner} height={inner} viewBox="0 0 32 32">
        {bleed ? null : <rect width="32" height="32" rx="7" fill={tok('canvas')} />}
        {bleed ? null : (
          <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" fill="none" stroke={tok('hairline-strong')} />
        )}
        <circle cx="18.2" cy="13" r="6" fill="none" stroke={tok('accent-text')} strokeWidth="3" />
        <rect x="7" y="22.4" width="18" height="3.2" rx="1.6" fill={tok('accent-text')} />
      </svg>
    </div>
  );
}
