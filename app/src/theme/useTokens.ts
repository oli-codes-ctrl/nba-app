import { useColorScheme } from 'react-native';

import { colors, type Colors, type ColorScheme } from './tokens';

export function useScheme(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useColors(): Colors {
  return colors[useScheme()];
}
