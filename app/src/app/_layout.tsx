import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { StatusBar } from 'expo-status-bar';

import { DataProvider } from '@/data/DataProvider';
import { FollowProvider } from '@/follow/FollowProvider';
import { TrophyProvider } from '@/game/TrophyProvider';
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
      <FollowProvider>
        <TrophyProvider>
          <ThemeProvider value={navTheme}>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <NativeTabs tintColor={c.accent}>
              <NativeTabs.Trigger name="(today)">
                <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="sun.max.fill" md="today" />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="players">
                <NativeTabs.Trigger.Label>Players</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="person.3.fill" md="groups" />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="graphs">
                <NativeTabs.Trigger.Label>Graphs</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="chart.dots.scatter" md="scatter_plot" />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="play">
                <NativeTabs.Trigger.Label>Play</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="gamecontroller.fill" md="sports_esports" />
              </NativeTabs.Trigger>
            </NativeTabs>
          </ThemeProvider>
        </TrophyProvider>
      </FollowProvider>
    </DataProvider>
  );
}
