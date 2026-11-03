/**
 * Which daily-puzzle reminders to schedule. Pure, so it can be tested.
 * Reminders are scheduled one by one for the next week (not as a repeating
 * trigger) so today's can be skipped once played and the text can mention a
 * live streak.
 */
import { localDate, type DailyStats } from '@/game/daily';

export const DEFAULT_HOUR = 18;
const DAYS_AHEAD = 7;

export type ReminderSettings = { enabled: boolean; hour: number };
export const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, hour: DEFAULT_HOUR };

export type PlannedReminder = { at: Date; title: string; body: string };

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function planReminders({
  now,
  hour,
  stats,
  playedToday,
}: {
  now: Date;
  hour: number;
  stats: DailyStats;
  playedToday: boolean;
}): PlannedReminder[] {
  const today = localDate(now);
  const yesterday = localDate(addDays(now, -1));
  const out: PlannedReminder[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(now, i);
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0);
    if (at <= now) continue;
    if (i === 0 && playedToday) continue;

    // The streak is only known to be alive for the next unplayed day.
    const alive =
      stats.currentStreak > 0 &&
      ((i === 0 && stats.lastDate === yesterday) || (i === 1 && stats.lastDate === today));
    out.push({
      at,
      title: alive ? `Keep your ${stats.currentStreak}-day streak going` : 'Today’s mystery player is up',
      body: alive
        ? 'Today’s mystery player is waiting. Three guesses.'
        : 'Three guesses to name them. Can you get it with no clues?',
    });
  }
  return out;
}

/** "6 PM" style label for an hour 0-23. */
export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}
