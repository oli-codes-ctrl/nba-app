import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useFollows } from '@/follow/FollowProvider';

import { loadCareer, loadCompareScore, loadMysteryStats, loadStats, loadStreakStats } from './storage';
import type { Facts } from './trophies';

/** Saved facts for every trophy, reloaded when the screen comes into view. */
export function useTrophyFacts(): Facts | null {
  const { ids } = useFollows();
  const [facts, setFacts] = useState<Omit<Facts, 'follows'> | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        loadStats(AsyncStorage),
        loadStreakStats(AsyncStorage),
        loadCompareScore(AsyncStorage),
        loadMysteryStats(AsyncStorage),
        loadCareer(AsyncStorage),
      ]).then(([daily, streak, compare, mystery, career]) => {
        if (!cancelled) setFacts({ daily, streak, compare, mystery, career });
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );
  return facts ? { ...facts, follows: ids.length } : null;
}
