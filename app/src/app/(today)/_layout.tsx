import { Stack } from 'expo-router';

import { useColors } from '@/theme/useTokens';

export default function TodayStack() {
  const c = useColors();
  return (
    <Stack screenOptions={{ headerTintColor: c.accent, headerTitleStyle: { color: c.text } }}>
      <Stack.Screen name="index" options={{ title: 'Today', headerLargeTitle: true }} />
      <Stack.Screen name="player/[id]" options={{ title: '' }} />
    </Stack>
  );
}
