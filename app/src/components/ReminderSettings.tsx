import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { hourLabel, type ReminderSettings as Settings } from '@/notify/plan';
import { loadReminderSettings, refreshReminders, requestPermission, saveReminderSettings } from '@/notify/reminders';
import { spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { AppText } from './AppText';
import { Segmented } from './Segmented';

const HOURS = [9, 12, 18, 21] as const;
type Hour = `${(typeof HOURS)[number]}`;

/** The opt-in daily puzzle reminder: on/off and the time of day. */
export function ReminderSettings() {
  const colors = useColors();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadReminderSettings().then((s) => {
      if (!cancelled) setSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings) return null;

  async function update(next: Settings) {
    if (next.enabled && !settings?.enabled) {
      const ok = await requestPermission();
      setDenied(!ok);
      if (!ok) return;
    }
    setSettings(next);
    await saveReminderSettings(next);
    await refreshReminders();
  }

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Daily puzzle reminder</AppText>
          <AppText variant="caption" color="textSecondary">
            One nudge a day, skipped once you’ve played.
          </AppText>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(enabled) => update({ ...settings, enabled })}
          trackColor={{ true: colors.accentFill, false: colors.border }}
          accessibilityLabel="Daily puzzle reminder"
        />
      </View>
      {denied && (
        <AppText variant="caption" color="danger">
          Notifications are off for this app. Turn them on in your phone’s Settings to get reminders.
        </AppText>
      )}
      {settings.enabled && (
        <Segmented<Hour>
          accessibilityLabel="Reminder time"
          options={HOURS.map((h) => ({ id: `${h}` as Hour, label: hourLabel(h) }))}
          value={`${settings.hour}` as Hour}
          onChange={(h) => update({ ...settings, hour: Number(h) })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
});
