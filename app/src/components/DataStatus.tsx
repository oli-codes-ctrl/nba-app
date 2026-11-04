import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useData } from '@/data/DataProvider';
import { formatDate, seasonLabel } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { AppText } from './AppText';

/** One line under the search box: what the data covers, and whether it is current. */
export function DataStatusLine() {
  const { snapshot, stale } = useData();
  if (!snapshot) return null;
  const { manifest } = snapshot;
  return (
    <AppText variant="caption" color={stale ? 'danger' : 'textSecondary'}>
      {seasonLabel(manifest.season)} season · games through {formatDate(manifest.gamesThrough ?? manifest.asOf)}
      {stale ? ' · offline, showing saved copy' : ''}
    </AppText>
  );
}

/** Full-screen state for first launch, before any data exists on the device. */
export function FirstLoad() {
  const { loading, error, refresh } = useData();
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <AppText variant="title">Couldn’t load stats</AppText>
          <AppText color="textSecondary" style={styles.message}>
            {error ?? 'Check your connection and try again.'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
            style={[styles.button, { backgroundColor: colors.accent }]}>
            <AppText variant="bodyStrong" color="textOnAccent">
              Try again
            </AppText>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  message: { textAlign: 'center' },
  button: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
});
