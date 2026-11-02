import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DataProvider } from '@/data/DataProvider';
import { colors } from '@/theme/tokens';
import { useScheme } from '@/theme/useTokens';

export default function RootLayout() {
  const scheme = useScheme();
  const c = colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.accent,
      background: c.background,
      card: c.background,
      text: c.text,
      border: c.border,
    },
  };

  return (
    <DataProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerTintColor: c.accent, headerTitleStyle: { color: c.text } }}>
          <Stack.Screen name="index" options={{ title: 'Players', headerLargeTitle: true }} />
          <Stack.Screen name="player/[id]" options={{ title: '' }} />
        </Stack>
      </ThemeProvider>
    </DataProvider>
  );
}
