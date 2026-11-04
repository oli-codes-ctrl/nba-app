import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useColors } from '@/theme/useTokens';

import { AppText } from './AppText';

/** Header button that opens Settings. 44 pt target; SF Symbol on iOS, text elsewhere. */
export function SettingsButton() {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={10}
      onPress={() => router.push('/settings')}
      style={styles.button}>
      <SymbolView
        name="gearshape"
        size={22}
        tintColor={colors.accent}
        fallback={
          <AppText variant="bodyStrong" color="accent">
            Settings
          </AppText>
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
