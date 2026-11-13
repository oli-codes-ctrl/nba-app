'use client';

/**
 * The games in the browser: localStorage behind the game logic's storage
 * interface, the reader's local date, and the trophy check. Scores stay in
 * this browser; there is no account.
 */
import { useEffect, useState } from 'react';

import { readFollows } from '@/components/player/FollowButton';
import type { KeyValueStore } from '@/data/DataSource';
import { SITE } from '@/lib/site';
import { localDate } from '@/game/daily';
import { loadCareer, loadCompareScore, loadMysteryStats, loadStats, loadStreakStats, updateCareer } from '@/game/storage';
import { newlyUnlocked, recordUnlocks, TROPHIES, type Facts, type Trophy } from '@/game/trophies';

import { TROPHY_EVENT, type TrophyEventDetail } from './trophyEvent';

/**
 * The trophies the site offers: the app's, without the two for Who Has
 * More?, a game the site doesn't have.
 */
export const SITE_TROPHIES: readonly Trophy[] = TROPHIES.filter((t) => t.game !== 'Who Has More?');
const OFFERED = new Set(SITE_TROPHIES.map((t) => t.id));

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

/**
 * Records and returns the trophies earned since the last check. Games show
 * them in their result; elsewhere (`announce`) the site-wide notice does.
 */
export async function claimTrophies({ announce = false }: { announce?: boolean } = {}): Promise<Trophy[]> {
  const fresh = newlyUnlocked(await loadFacts(browserStore)).filter((t) => OFFERED.has(t.id));
  if (!fresh.length) return fresh;
  await updateCareer(browserStore, (c) => recordUnlocks(c, fresh, localDate(new Date())));
  if (announce) {
    const detail: TrophyEventDetail = { trophies: fresh.map(({ id, title, description }) => ({ id, title, description })) };
    window.dispatchEvent(new CustomEvent(TROPHY_EVENT, { detail }));
  }
  return fresh;
}

/** A team page was opened: counts toward Scout. */
export function countTeamVisit(abbr: string): void {
  updateCareer(browserStore, (c) => (c.teamsVisited.includes(abbr) ? c : { ...c, teamsVisited: [...c.teamsVisited, abbr] }))
    .then(() => claimTrophies({ announce: true }))
    .catch(() => {});
}

/** A head-to-head was opened: counts toward Debate Club. */
export function countVersus(): void {
  updateCareer(browserStore, (c) => ({ ...c, versusViews: c.versusViews + 1 }))
    .then(() => claimTrophies({ announce: true }))
    .catch(() => {});
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * The share sheet on touch screens, the clipboard elsewhere (a desktop share
 * sheet is rarely where a group chat lives). `path` is the game's page.
 */
export async function shareResult(text: string, path: string): Promise<ShareOutcome> {
  const url = `${window.location.origin}${SITE.basePath}${path}`;
  try {
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch (err) {
    // Closing the share sheet is not a failure.
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

/** "5h 12m" until the reader's midnight, when the next puzzle unlocks. */
export function untilMidnight(now: Date): string {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.round((midnight.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}
