import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ReminderSettings } from '@/components/ReminderSettings';
import { Section } from '@/components/Section';
import { Segmented } from '@/components/Segmented';
import { useData } from '@/data/DataProvider';
import { formatDate } from '@/lib/format';
import { remindersSupported } from '@/notify/reminders';
import { useThemePreference, type ThemePreference } from '@/theme/ThemePreference';
import { spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

const APPEARANCE: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { preference, setPreference } = useThemePreference();
  const { snapshot } = useData();
  const through = snapshot ? (snapshot.manifest.gamesThrough ?? snapshot.manifest.asOf) : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Section title="Appearance">
        <Card>
          <Segmented accessibilityLabel="Appearance" options={APPEARANCE} value={preference} onChange={setPreference} />
          <AppText variant="caption" color="textSecondary">
            Dark is the default. System follows your phone’s setting.
          </AppText>
        </Card>
      </Section>

      {remindersSupported && (
        <Section title="Reminders">
          <Card>
            <ReminderSettings />
          </Card>
        </Section>
      )}

      <Section title="About">
        <Card>
          <View style={styles.about}>
            <AppText variant="small">
              Stats come from ESPN’s public data, refreshed every morning
              {through ? `, and currently cover games through ${formatDate(through)}` : ''}.
            </AppText>
            <AppText variant="small" color="textSecondary">
              Percentiles rank players only against qualified players, and shooting percentages only with enough
              attempts. Formulas follow standard references (Basketball-Reference’s glossary, Dean Oliver, John
              Hollinger).
            </AppText>
            <AppText variant="small" color="textSecondary">
              Not affiliated with the NBA, its teams or ESPN. No logos or player photos.
            </AppText>
          </View>
          <AppText variant="caption" color="textSecondary">
            Version {Constants.expoConfig?.version ?? '1.0.0'}
          </AppText>
        </Card>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  about: { gap: spacing.sm },
});
