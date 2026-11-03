/**
 * Local notifications for the daily puzzle. Opt-in, scheduled on the device,
 * no server or push token. Call refreshReminders() whenever the answer might
 * have changed: app opened, game finished, setting changed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { localDate } from '@/game/daily';
import { loadGame, loadStats } from '@/game/storage';

import { DEFAULT_SETTINGS, planReminders, type ReminderSettings } from './plan';

const KEY = 'hoops:reminder:v1';

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReminderSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => {});
}

/** Ask for permission. Returns whether notifications may be shown. */
export async function requestPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

let pending: Promise<void> = Promise.resolve();

/** Replace the scheduled reminders with a fresh plan. Calls are queued so they never interleave. */
export function refreshReminders(): Promise<void> {
  pending = pending.then(doRefresh).catch(() => {});
  return pending;
}

async function doRefresh(): Promise<void> {
  if (!remindersSupported) return;
  const settings = await loadReminderSettings();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const now = new Date();
  const [stats, game] = await Promise.all([loadStats(AsyncStorage), loadGame(AsyncStorage, localDate(now))]);
  const plan = planReminders({ now, hour: settings.hour, stats, playedToday: game.status !== 'playing' });
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
    });
  }
}
