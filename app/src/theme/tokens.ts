/**
 * Design tokens. Every color a component uses comes from here, so light and
 * dark mode stay in sync. Components read them through `useColors()`.
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
    accent: '#D9480F',
    danger: '#C92A2A',
    // Percentile scale: poor, middling, strong.
    scaleLow: '#E03131',
    scaleMid: '#F08C00',
    scaleHigh: '#2F9E44',
    scaleTrack: '#E4E6EA',
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
    danger: '#FF6B6B',
    scaleLow: '#FF6B6B',
    scaleMid: '#FCC419',
    scaleHigh: '#51CF66',
    scaleTrack: '#2A2E34',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ColorToken = keyof (typeof palette)['light'];
export type Colors = Record<ColorToken, string>;

export const colors: Record<ColorScheme, Colors> = palette;

/** Text colors that sit on a team chip, chosen by the chip's brightness. */
export const chipText = { onLight: '#111316', onDark: '#FFFFFF' } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const font = {
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
  size: { caption: 12, small: 14, body: 16, title: 20, large: 28 },
} as const;
