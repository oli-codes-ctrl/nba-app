/** Saves each day's game and the running stats on the device. */
import type { KeyValueStore } from '@/data/DataSource';

import { EMPTY_SCORE, type CompareScore } from './compare';
import { EMPTY_STATS, newGame, type DailyStats, type GameState } from './daily';
import { EMPTY_MYSTERY_STATS, type MysteryStats } from './mystery';
import { EMPTY_STREAK_STATS, type StreakStats } from './streak';
import { EMPTY_CAREER, type Career } from './trophies';

const compareKey = 'hoops:compare:v1:score';

export async function loadCompareScore(store: KeyValueStore): Promise<CompareScore> {
  return { ...EMPTY_SCORE, ...(await readJson<CompareScore>(store, compareKey)) };
}

export async function saveCompareScore(store: KeyValueStore, score: CompareScore): Promise<void> {
  try {
    await store.setItem(compareKey, JSON.stringify(score));
  } catch {
    // A lost running score is not worth an error screen.
  }
}

const mysteryKey = 'hoops:mystery:v1:stats';

export async function loadMysteryStats(store: KeyValueStore): Promise<MysteryStats> {
  return { ...EMPTY_MYSTERY_STATS, ...(await readJson<MysteryStats>(store, mysteryKey)) };
}

export async function saveMysteryStats(store: KeyValueStore, stats: MysteryStats): Promise<void> {
  await store.setItem(mysteryKey, JSON.stringify(stats)).catch(() => {});
}

const careerKey = 'hoops:career:v1';

export async function loadCareer(store: KeyValueStore): Promise<Career> {
  const saved = await readJson<Partial<Career>>(store, careerKey);
  return { ...EMPTY_CAREER, ...saved, unlocked: { ...(saved?.unlocked ?? {}) } };
}

let careerQueue: Promise<unknown> = Promise.resolve();

/** Read-modify-write the career counters. Calls are queued so none is lost. */
export function updateCareer(store: KeyValueStore, change: (c: Career) => Career): Promise<Career> {
  const next = careerQueue.then(async () => {
    const updated = change(await loadCareer(store));
    await store.setItem(careerKey, JSON.stringify(updated)).catch(() => {});
    return updated;
  });
  careerQueue = next.catch(() => {});
  return next;
}

const streakKey = 'hoops:streak:v1:stats';

export async function loadStreakStats(store: KeyValueStore): Promise<StreakStats> {
  return { ...EMPTY_STREAK_STATS, ...(await readJson<StreakStats>(store, streakKey)) };
}

export async function saveStreakStats(store: KeyValueStore, stats: StreakStats): Promise<void> {
  try {
    await store.setItem(streakKey, JSON.stringify(stats));
  } catch {
    // A lost best streak is not worth an error screen.
  }
}

const PREFIX = 'hoops:daily:v1';
const statsKey = `${PREFIX}:stats`;
const gameKey = (date: string) => `${PREFIX}:game:${date}`;

async function readJson<T>(store: KeyValueStore, key: string): Promise<T | null> {
  try {
    const raw = await store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function loadGame(store: KeyValueStore, date: string): Promise<GameState> {
  const saved = await readJson<GameState>(store, gameKey(date));
  return saved && saved.date === date ? saved : newGame(date);
}

export async function saveGame(store: KeyValueStore, state: GameState): Promise<void> {
  try {
    await store.setItem(gameKey(state.date), JSON.stringify(state));
  } catch {
    // Losing progress on a full disk is better than crashing the game.
  }
}

export async function loadStats(store: KeyValueStore): Promise<DailyStats> {
  return { ...EMPTY_STATS, ...(await readJson<DailyStats>(store, statsKey)) };
}

export async function saveStats(store: KeyValueStore, stats: DailyStats): Promise<void> {
  try {
    await store.setItem(statsKey, JSON.stringify(stats));
  } catch {
    // See saveGame.
  }
}
