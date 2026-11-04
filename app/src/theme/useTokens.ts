import { useColorScheme } from 'react-native';

import { useThemePreference } from './ThemePreference';
import { chartColors, colors, type ChartColors, type Colors, type ColorScheme } from './tokens';

/** The mode to draw in: the user's setting, or the phone's when set to System. */
export function useScheme(): ColorScheme {
  const { preference } = useThemePreference();
  const system = useColorScheme();
  if (preference !== 'system') return preference;
  return system === 'light' ? 'light' : 'dark';
}

export function useColors(): Colors {
  return colors[useScheme()];
}

export function useChartColors(): ChartColors {
  return chartColors[useScheme()];
}
