/**
 * Design tokens. Every color, size, space and duration a component uses
 * comes from here, so the two modes stay in sync and the app reads as one
 * system. Components read colors through `useColors()`.
 *
 * Dark mode is the default (Settings offers System / Dark / Light).
 * Every text color meets WCAG AA (4.5:1) on every surface and every bar
 * meets 3:1 against its track; __tests__/contrast.test.ts enforces both.
 */
import { Platform } from 'react-native';

const palette = {
  light: {
    background: '#FFFFFF',
    surface: '#F2F3F5',
    surfaceRaised: '#FFFFFF',
    border: '#D9DCE1',
    text: '#111316',
    textSecondary: '#5C6370',
    textOnAccent: '#FFFFFF',
    /** Actions: links, selected states. Readable as text on every surface. */
    accent: '#C2410C',
    /** Filled buttons and cards that carry white text (5:1). */
    accentFill: '#C2410C',
    /** Game feedback only (right/wrong), always with a mark or label. */
    success: '#1E7B34',
    danger: '#C92A2A',
    /** The 0-100 line behind percentile bars. */
    scaleTrack: '#E4E6EA',
    shadow: '#000000',
  },
  dark: {
    background: '#0B0C0E',
    surface: '#17191C',
    surfaceRaised: '#202328',
    border: '#2E3238',
    text: '#F1F3F5',
    textSecondary: '#A1A8B3',
    textOnAccent: '#FFFFFF',
    accent: '#FF7A3D',
    accentFill: '#C2410C',
    success: '#4CC26B',
    danger: '#FF6B6B',
    scaleTrack: '#2A2E34',
    shadow: '#000000',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ColorToken = keyof (typeof palette)['light'];
export type Colors = Record<ColorToken, string>;

export const colors: Record<ColorScheme, Colors> = palette;

/**
 * Percentile bars, cold to hot: 0-20, 20-40, 40-60, 60-80, 80-100th.
 * Two hues with a gray middle (a diverging scale); the extremes carry the
 * most weight (darkest in light mode, lightest in dark). Bar length carries
 * the value, color marks direction and extremity. Checked with the dataviz
 * palette validator against each mode's card: adjacent steps separate under
 * color-vision deficiency (Delta E 9.4 or more) and for normal vision (16 or
 * more), and every step clears 3:1 against the track and the card.
 */
export const percentileScale: Record<ColorScheme, readonly string[]> = {
  light: ['#123E7A', '#2A78D6', '#7A7873', '#D2582A', '#8F2E0C'],
  dark: ['#9CC8F7', '#3987E5', '#898781', '#E8692F', '#FFB08A'],
};

/** The scale step for "better than X%" (0-100). */
export function percentileColor(scheme: ColorScheme, better: number): string {
  const steps = percentileScale[scheme];
  const i = Math.min(steps.length - 1, Math.max(0, Math.floor(better / (100 / steps.length))));
  return steps[i];
}

/**
 * Chart colors. Validated with the dataviz palette checker against each
 * mode's background: the two trend colors pass all-pairs CVD and contrast
 * checks; each ramp passes the ordinal checks (one hue, visible steps).
 * Ramps run low to high. In dark mode low recedes into the background.
 */
export type ChartColors = {
  grid: string;
  axis: string;
  axisLabel: string;
  aboveTrend: string;
  belowTrend: string;
  trendLine: string;
  highlight: string;
  /** Unemphasized dots, so one highlighted dot stands out. Above 3:1 on each background. */
  neutral: string;
  ramp: readonly string[];
  /**
   * Dots by position: guards, forwards, centers. Green, violet and magenta,
   * so they never borrow the blue/orange "cold to hot" meaning of the
   * percentile bars. Validated all-pairs (scatter rule) in both modes against
   * the card and the page: color-vision Delta E 14.0 light / 13.0 dark,
   * normal vision 23.6 / 19.7, every dot 3:1 or more.
   */
  positions: { G: string; F: string; C: string };
  /** Dashed league-median reference lines. */
  median: string;
};

export const chartColors: Record<ColorScheme, ChartColors> = {
  light: {
    grid: '#E1E0D9',
    axis: '#C3C2B7',
    axisLabel: '#6B6A65',
    aboveTrend: '#2A78D6',
    belowTrend: '#EB6834',
    trendLine: '#52514E',
    highlight: '#0B0B0B',
    neutral: '#898781',
    ramp: ['#86B6EF', '#3987E5', '#256ABF', '#184F95', '#0D366B'],
    positions: { G: '#008300', F: '#6250D6', C: '#D0578A' },
    median: '#6B6A65',
  },
  dark: {
    grid: '#2C2C2A',
    axis: '#383835',
    axisLabel: '#A9A79F',
    aboveTrend: '#3987E5',
    belowTrend: '#D95926',
    trendLine: '#C3C2B7',
    highlight: '#F0EFEC',
    neutral: '#898781',
    ramp: ['#184F95', '#256ABF', '#3987E5', '#86B6EF', '#CDE2FB'],
    positions: { G: '#008300', F: '#9085E9', C: '#D55181' },
    median: '#A9A79F',
  },
};

/** Text colors that sit on a team chip, chosen by the chip's brightness. */
export const chipText = { onLight: '#111316', onDark: '#FFFFFF' } as const;

/** A 4-point grid. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

/** Type scale (points). Line heights live with the variants in AppText. */
export const font = {
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
  size: { caption: 12, small: 14, body: 16, title: 20, large: 28, display: 40 },
} as const;

/** Motion: short and purposeful. Skip it when the system asks for reduced motion. */
export const motion = { fast: 150, base: 200, slow: 250, pulse: 900 } as const;
