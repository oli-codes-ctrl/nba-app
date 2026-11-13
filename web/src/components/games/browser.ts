'use client';

/**
 * The games in the browser: localStorage behind the game logic's storage
 * interface, the reader's local date, and the trophy check. Scores stay in
 * this browser; there is no account.
 */
import { useEffect, useState } from 'react';

import { readFollows } from '@/components/player/FollowButton';
import type { KeyValueStore } from '@/data/DataSource';
import { localDate } from '@/game/daily';
import { loadCareer, loadCompareScore, loadMysteryStats, loadStats, loadStreakStats, updateCareer } from '@/game/storage';
import { newlyUnlocked, recordUnlocks, type Facts, type Trophy } from '@/game/trophies';

/** localStorage as the game logic's store. Private mode or a full disk only loses progress. */
export const browserStore: KeyValueStore = {
  async getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Nothing to do: the game keeps working, it just won't be remembered.
    }
  },
};

/**
 * The reader's local date, YYYY-MM-DD, or null before the page has hydrated
 * (the static HTML can't know it). Checked every minute and when the tab
 * comes back, so a page left open past midnight moves to the new puzzle.
 */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setToday(localDate(new Date()));
    sync();
    const timer = window.setInterval(sync, 60_000);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return today;
}

/** Everything the trophies are judged on. */
export async function loadFacts(store: KeyValueStore = browserStore): Promise<Facts> {
  const [daily, streak, compare, mystery, career] = await Promise.all([
    loadStats(store),
    loadStreakStats(store),
    loadCompareScore(store),
    loadMysteryStats(store),
    loadCareer(store),
  ]);
  return { daily, streak, compare, mystery, career, follows: readFollows().length };
}

/** Records and returns the trophies earned since the last check. */
export async function claimTrophies(store: KeyValueStore = browserStore): Promise<Trophy[]> {
  const fresh = newlyUnlocked(await loadFacts(store));
  if (fresh.length) await updateCareer(store, (c) => recordUnlocks(c, fresh, localDate(new Date())));
  return fresh;
}

/** "5h 12m" until the reader's midnight, when the next puzzle unlocks. */
export function untilMidnight(now: Date): string {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.round((midnight.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}
