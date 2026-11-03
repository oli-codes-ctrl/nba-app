import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useData } from '@/data/DataProvider';
import type { Puzzle } from '@/data/types';

import type { CompareScore } from './compare';
import { puzzleFor, type DailyStats, type GameState } from './daily';
import { loadCompareScore, loadGame, loadStats, loadStreakStats } from './storage';
import type { StreakStats } from './streak';
import { useToday } from './useDailyGame';

export type Progress = {
  game: GameState | null;
  daily: DailyStats;
  streak: StreakStats;
  compare: CompareScore;
};

/** Saved progress in all three games, reloaded each time the screen comes into view. */
export function useGameProgress(): { today: string; puzzle: Puzzle | null; progress: Progress | null } {
  const { snapshot } = useData();
  const today = useToday();
  const puzzle = snapshot ? puzzleFor(snapshot.puzzles.puzzles, today) : null;
  const puzzleDate = puzzle?.date ?? null;
  const [progress, setProgress] = useState<Progress | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        puzzleDate ? loadGame(AsyncStorage, puzzleDate) : Promise.resolve(null),
        loadStats(AsyncStorage),
        loadStreakStats(AsyncStorage),
        loadCompareScore(AsyncStorage),
      ]).then(([game, daily, streak, compare]) => {
        if (!cancelled) setProgress({ game, daily, streak, compare });
      });
      return () => {
        cancelled = true;
      };
    }, [puzzleDate]),
  );

  return { today, puzzle, progress };
}
