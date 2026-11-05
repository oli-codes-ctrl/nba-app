/**
 * WCAG 2.1 contrast for every color pairing the app relies on, in both
 * modes: 4.5:1 for text, 3:1 for bars and other graphics (1.4.3, 1.4.11).
 * A token change that breaks contrast fails here instead of on a phone.
 */
import { chipTextColor, luminance, TEAMS } from '@/theme/teams';
import { chartColors, colors, percentileScale, type ColorScheme, type ColorToken } from '@/theme/tokens';

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SCHEMES: ColorScheme[] = ['dark', 'light'];
const SURFACES: ColorToken[] = ['background', 'surface', 'surfaceRaised'];

describe.each(SCHEMES)('%s mode', (scheme) => {
  const c = colors[scheme];

  it.each(['text', 'textSecondary', 'accent', 'danger', 'success'] as ColorToken[])(
    '%s is readable on every surface',
    (fg) => {
      for (const bg of SURFACES) expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('white text is readable on filled accent buttons', () => {
    expect(contrast(c.textOnAccent, c.accentFill)).toBeGreaterThanOrEqual(4.5);
  });

  it('chart dots and lines stand out on shaded bands', () => {
    const band = chartColors[scheme].band;
    expect(contrast(c.textSecondary, band)).toBeGreaterThanOrEqual(3);
    expect(contrast(chartColors[scheme].trendLine, band)).toBeGreaterThanOrEqual(3);
    expect(contrast(c.text, band)).toBeGreaterThanOrEqual(4.5);
  });

  it('every percentile bar step stands out from its track and the card', () => {
    for (const step of percentileScale[scheme]) {
      expect(contrast(step, c.scaleTrack)).toBeGreaterThanOrEqual(3);
      expect(contrast(step, c.surface)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('team chips', () => {
  it.each(Object.entries(TEAMS))('%s chip text is readable', (_abbr, team) => {
    expect(contrast(chipTextColor(team.color), team.color)).toBeGreaterThanOrEqual(4.5);
  });
});
