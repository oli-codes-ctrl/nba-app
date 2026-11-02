import { useColorScheme } from 'react-native';

import { chartColors, colors, type ChartColors, type Colors, type ColorScheme } from './tokens';

export function useChartColors(): ChartColors {
  return chartColors[useScheme()];
}

export function useScheme(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useColors(): Colors {
  return colors[useScheme()];
}
