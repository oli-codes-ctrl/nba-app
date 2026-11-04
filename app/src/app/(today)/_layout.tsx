import { Stack } from 'expo-router';

import { SettingsButton } from '@/components/SettingsButton';
import { useColors } from '@/theme/useTokens';

export default function TodayStack() {
  const c = useColors();
  return (
    <Stack screenOptions={{ headerTintColor: c.accent, headerTitleStyle: { color: c.text } }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Today', headerLargeTitle: true, headerRight: () => <SettingsButton /> }}
      />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="player/[id]" options={{ title: '' }} />
      <Stack.Screen name="team/[abbr]" options={{ title: '' }} />
      <Stack.Screen name="versus" options={{ title: 'Head to Head' }} />
    </Stack>
  );
}
