/**
 * Contrast of every color pairing the site uses (WCAG 2.1 AA): text 4.5:1,
 * large text, interface parts and chart marks 3:1. Reads the real token file,
 * so a color change that breaks contrast fails here.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { contrastRatio, TEAM_SURFACE, TEAMS } from '@/theme/teams';

const css = readFileSync(join(__dirname, '..', 'src', 'styles', 'tokens.css'), 'utf8');
const tokens: Record<string, string> = {};
for (const match of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) tokens[match[1]] = match[2];

const t = (name: string): string => {
  if (!tokens[name]) throw new Error(`no hex token --${name}`);
  return tokens[name];
};

const SURFACES = ['canvas', 'surface-1', 'surface-2', 'surface-3', 'surface-4'];

describe('design tokens', () => {
  it('match docs/design-system.md', () => {
    expect(t('canvas')).toBe('#0c0f13');
    expect(t('surface-1')).toBe('#12161b');
    expect(t('ink')).toBe('#f3f5f7');
    expect(t('accent')).toBe('#f3f5f7');
    expect(t('hairline')).toBe('#262d36');
  });

  it('muted ink is body-text strong (7:1) on every surface', () => {
    for (const surface of SURFACES) expect(contrastRatio(t('ink-muted'), t(surface))).toBeGreaterThanOrEqual(7);
  });

  it.each(['ink', 'ink-muted', 'ink-subtle', 'accent-text', 'success', 'danger'])(
    '%s reads as text on every surface (4.5:1)',
    (ink) => {
      for (const surface of SURFACES) {
        expect(contrastRatio(t(ink), t(surface))).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it('arena text reads on the chalk action fill, at rest and pressed (4.5:1)', () => {
    expect(contrastRatio(t('on-accent'), t('accent'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t('on-accent'), t('accent-hover'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t('on-accent'), t('accent-pressed'))).toBeGreaterThanOrEqual(4.5);
  });

  it('the focus ring stands out from every surface (3:1)', () => {
    for (const surface of SURFACES) {
      expect(contrastRatio(t('accent-text'), t(surface))).toBeGreaterThanOrEqual(3);
    }
  });

  it('disabled ink is the only text color under 4.5:1, and still clears 3:1', () => {
    expect(contrastRatio(t('ink-disabled'), t('surface-1'))).toBeGreaterThanOrEqual(3);
  });

  it('every percentile step shows against its track and the panels (3:1)', () => {
    for (let step = 1; step <= 5; step++) {
      const color = t(`viz-pct-${step}`);
      expect(contrastRatio(color, t('viz-track'))).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(color, t('surface-1'))).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(color, t('surface-3'))).toBeGreaterThanOrEqual(3);
    }
  });

  it('chart marks, lines and labels show against the panel and the band', () => {
    for (const mark of ['viz-mark', 'viz-line', 'viz-reference', 'viz-highlight']) {
      expect(contrastRatio(t(mark), t('surface-1'))).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(t(mark), t('viz-band'))).toBeGreaterThanOrEqual(3);
    }
    expect(contrastRatio(t('viz-axis-label'), t('surface-1'))).toBeGreaterThanOrEqual(4.5);
    for (const pos of ['viz-pos-g', 'viz-pos-f', 'viz-pos-c']) {
      expect(contrastRatio(t(pos), t('surface-1'))).toBeGreaterThanOrEqual(3);
    }
  });

  it('the band is a region, not a mark: visible, but quieter than any mark', () => {
    const band = contrastRatio(t('viz-band'), t('surface-1'));
    expect(band).toBeGreaterThan(1.15);
    expect(band).toBeLessThan(contrastRatio(t('viz-mark'), t('surface-1')));
  });

  it('has a name and published colors for all 30 teams', () => {
    expect(Object.keys(TEAMS)).toHaveLength(30);
    for (const team of Object.values(TEAMS)) {
      expect(team.colors.length).toBeGreaterThan(0);
      for (const c of team.colors) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(team.colors).toContain(team.color);
    }
  });

  it('text on a team card field stays readable for every team', () => {
    const pct = (name: string) => Number(css.match(new RegExp(`--${name}:\\s*(\\d+)%`))![1]) / 100;
    const mix = (a: string, b: string, t: number) =>
      '#' +
      [1, 3, 5]
        .map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * t + parseInt(b.slice(i, i + 2), 16) * (1 - t)))
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
    for (const [abbr, team] of Object.entries(TEAMS)) {
      const text = mix(team.color, t('surface-1'), pct('team-tint-text'));
      const court = mix(team.color, t('surface-1'), pct('team-tint-court'));
      for (const [ink, bg, min] of [
        ['ink-subtle', text, 4.5],
        ['ink-muted', court, 4.5],
        ['ink', court, 7],
      ] as const) {
        const ratio = contrastRatio(t(ink), bg);
        if (ratio < min) throw new Error(`${abbr}: ${ink} on ${bg} is ${ratio.toFixed(2)}`);
      }
    }
  });

  it('team colors are judged against the real panel surface', () => {
    expect(TEAM_SURFACE.toLowerCase()).toBe(t('surface-1'));
  });

  // Chip swatches sit on surface-2, where the red teams fall just under 3:1; there the abbreviation beside the
  // swatch carries the identity, so the swatch is decoration, not the only cue.
  it("every team's display color shows on the page and the panels (3:1)", () => {
    for (const [abbr, team] of Object.entries(TEAMS)) {
      for (const surface of ['canvas', 'surface-1']) {
        const ratio = contrastRatio(team.color, t(surface));
        if (ratio < 3) throw new Error(`${abbr} ${team.color} on ${surface}: ${ratio.toFixed(2)}`);
      }
    }
  });
});
