import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
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
        <NativeTabs tintColor={c.accent}>
          <NativeTabs.Trigger name="(players)">
            <NativeTabs.Trigger.Label>Players</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="person.3.fill" md="groups" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="graphs">
            <NativeTabs.Trigger.Label>Graphs</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="chart.dots.scatter" md="scatter_plot" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="daily">
            <NativeTabs.Trigger.Label>Daily</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="questionmark.circle.fill" md="quiz" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="compare">
            <NativeTabs.Trigger.Label>Compare</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="arrow.left.arrow.right" md="compare_arrows" />
          </NativeTabs.Trigger>
        </NativeTabs>
      </ThemeProvider>
    </DataProvider>
  );
}
