import { Stack } from 'expo-router';

import { useColors } from '@/theme/useTokens';

export default function PlayStack() {
  const c = useColors();
  return (
    <Stack screenOptions={{ headerTintColor: c.accent, headerTitleStyle: { color: c.text } }}>
      <Stack.Screen name="index" options={{ title: 'Play', headerLargeTitle: true }} />
      <Stack.Screen name="daily" options={{ title: 'Daily Guess' }} />
      <Stack.Screen name="streak" options={{ title: 'Higher or Lower' }} />
      <Stack.Screen name="compare" options={{ title: 'Who Has More?' }} />
      <Stack.Screen name="mystery" options={{ title: 'Box Score Mystery' }} />
      <Stack.Screen name="trophies" options={{ title: 'Trophies' }} />
      <Stack.Screen name="player/[id]" options={{ title: '' }} />
      <Stack.Screen name="team/[abbr]" options={{ title: '' }} />
      <Stack.Screen name="versus" options={{ title: 'Head to Head' }} />
    </Stack>
  );
}
