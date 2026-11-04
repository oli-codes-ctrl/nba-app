import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { Puzzle } from '@/data/types';

import {
  EMPTY_STATS,
  guess as applyGuess,
  isDoublePoints,
  localDate,
  recordResult,
  revealClue as applyClue,
  type DailyStats,
  type GameState,
} from './daily';
import { rightFeedback, tapFeedback, wrongFeedback } from '@/lib/haptics';
import { refreshReminders } from '@/notify/reminders';

import { loadGame, loadStats, saveGame, saveStats, updateCareer } from './storage';
import { useTrophies } from './TrophyProvider';

/** The device's date, updated when the app comes back to the foreground. */
export function useToday(): string {
  const [today, setToday] = useState(() => localDate(new Date()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setToday(localDate(new Date()));
    });
    return () => sub.remove();
  }, []);
  return today;
}

export function useDailyGame(puzzle: Puzzle | null) {
  const date = puzzle?.date ?? '';
  // Keyed by date, so switching days never shows the previous day's game.
  const [loaded, setLoaded] = useState<{ date: string; state: GameState } | null>(null);
  const [stats, setStats] = useState<DailyStats>(EMPTY_STATS);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    Promise.all([loadGame(AsyncStorage, date), loadStats(AsyncStorage)]).then(([state, saved]) => {
      if (cancelled) return;
      setLoaded({ date, state });
      setStats(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const state = loaded?.date === date ? loaded.state : null;
  const trophies = useTrophies();

  const update = useCallback(
    (next: GameState) => {
      if (!puzzle || !state || next === state) return;
      if (next.guesses.length > state.guesses.length) {
        if (next.status === 'won') rightFeedback();
        else wrongFeedback();
      } else {
        tapFeedback();
      }
      setLoaded({ date: next.date, state: next });
      const saves: Promise<void>[] = [saveGame(AsyncStorage, next)];
      if (next.status !== 'playing') {
        const updated = recordResult(stats, next, puzzle);
        if (updated !== stats) {
          setStats(updated);
          saves.push(saveStats(AsyncStorage, updated));
        }
        if (updated !== stats && next.status === 'won') {
          saves.push(
            updateCareer(AsyncStorage, (c) => ({
              ...c,
              dailyNoClueWins: c.dailyNoClueWins + (next.clues === 0 ? 1 : 0),
              dailyDoubleWins: c.dailyDoubleWins + (isDoublePoints(next.date) ? 1 : 0),
            })).then(() => {}),
          );
        }
        // Skip today's reminder and update the streak wording.
        Promise.all(saves).then(() => {
          refreshReminders();
          trophies.check();
        });
      }
    },
    [puzzle, state, stats, trophies],
  );

  return {
    state,
    stats,
    guess: (playerId: number) => state && puzzle && update(applyGuess(state, puzzle, playerId)),
    revealClue: () => state && update(applyClue(state)),
  };
}
