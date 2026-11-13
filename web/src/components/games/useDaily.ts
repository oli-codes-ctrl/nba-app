'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Puzzle } from '@/data/types';
import {
  guess as applyGuess,
  isDoublePoints,
  recordResult,
  revealClue as applyClue,
  type DailyStats,
  type GameState,
} from '@/game/daily';
import { loadGame, loadStats, saveGame, saveStats, updateCareer } from '@/game/storage';
import type { Trophy } from '@/game/trophies';

import { browserStore, claimTrophies } from './browser';

/**
 * One day's Daily Guess, saved in this browser after every move. The rules
 * are the app's (`game/daily.ts`, unchanged). `state` is null until the
 * saved game has loaded, so the static HTML never shows a wrong board.
 */
export function useDailyGame(puzzle: Puzzle | null) {
  const date = puzzle?.date ?? '';
  // Keyed by date, so a new day never shows the previous day's game.
  const [loaded, setLoaded] = useState<{ date: string; state: GameState } | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [earned, setEarned] = useState<Trophy[]>([]);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    Promise.all([loadGame(browserStore, date), loadStats(browserStore)]).then(([state, saved]) => {
      if (cancelled) return;
      setLoaded({ date, state });
      setStats(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const state = loaded?.date === date ? loaded.state : null;

  const update = useCallback(
    (next: GameState) => {
      if (!puzzle || !state || !stats || next === state) return;
      setLoaded({ date: next.date, state: next });
      const saves: Promise<unknown>[] = [saveGame(browserStore, next)];
      if (next.status === 'playing') return;
      const updated = recordResult(stats, next, puzzle);
      if (updated !== stats) {
        setStats(updated);
        saves.push(saveStats(browserStore, updated));
        if (next.status === 'won') {
          saves.push(
            updateCareer(browserStore, (c) => ({
              ...c,
              dailyNoClueWins: c.dailyNoClueWins + (next.clues === 0 ? 1 : 0),
              dailyDoubleWins: c.dailyDoubleWins + (isDoublePoints(next.date) ? 1 : 0),
            })),
          );
        }
      }
      Promise.all(saves)
        .then(() => claimTrophies())
        .then((fresh) => {
          if (fresh.length) setEarned(fresh);
        });
    },
    [puzzle, state, stats],
  );

  return {
    state,
    stats,
    /** Trophies this game just earned. */
    earned,
    guess: (playerId: number) => {
      if (state && puzzle) update(applyGuess(state, puzzle, playerId));
    },
    revealClue: () => {
      if (state) update(applyClue(state));
    },
  };
}
