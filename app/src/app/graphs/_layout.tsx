import { Stack } from 'expo-router';

import { useColors } from '@/theme/useTokens';

export default function GraphsStack() {
  const c = useColors();
  return (
    <Stack screenOptions={{ headerTintColor: c.accent, headerTitleStyle: { color: c.text } }}>
      <Stack.Screen name="index" options={{ title: 'Graphs', headerLargeTitle: true }} />
      <Stack.Screen name="player/[id]" options={{ title: '' }} />
      <Stack.Screen name="team/[abbr]" options={{ title: '' }} />
      <Stack.Screen name="versus" options={{ title: 'Head to Head' }} />
    </Stack>
  );
}
