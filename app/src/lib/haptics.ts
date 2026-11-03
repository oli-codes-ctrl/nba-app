/** Small taps of feedback in the games. Silent on web and when unsupported. */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export function tapFeedback() {
  if (enabled) Haptics.selectionAsync().catch(() => {});
}

export function rightFeedback() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function wrongFeedback() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
