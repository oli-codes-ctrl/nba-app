import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { AppText } from './AppText';

/** A titled block on a scrolling screen. */
export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {note ? (
          <AppText variant="caption" color="textSecondary">
            {note}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  head: { gap: 2 },
});
