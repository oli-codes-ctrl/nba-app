/**
 * Checks for newly earned trophies and shows a banner. Games call check()
 * after saving a result; follow changes are watched here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { useFollows } from '@/follow/FollowProvider';
import { rightFeedback } from '@/lib/haptics';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { localDate } from './daily';
import { loadCompareScore, loadMysteryStats, loadStats, loadStreakStats, updateCareer } from './storage';
import { newlyUnlocked, recordUnlocks, type Trophy } from './trophies';

type TrophyState = { check: () => Promise<void> };

const TrophyContext = createContext<TrophyState | null>(null);
const SHOW_MS = 3500;

export function TrophyProvider({ children }: { children: ReactNode }) {
  const { ids } = useFollows();
  const follows = useRef(ids.length);
  const [queue, setQueue] = useState<Trophy[]>([]);

  const check = useCallback(async () => {
    const [daily, streak, compare, mystery] = await Promise.all([
      loadStats(AsyncStorage),
      loadStreakStats(AsyncStorage),
      loadCompareScore(AsyncStorage),
      loadMysteryStats(AsyncStorage),
    ]);
    let earned: Trophy[] = [];
    await updateCareer(AsyncStorage, (career) => {
      earned = newlyUnlocked({ daily, streak, compare, mystery, career, follows: follows.current });
      return recordUnlocks(career, earned, localDate(new Date()));
    });
    if (earned.length > 0) {
      rightFeedback();
      setQueue((q) => [...q, ...earned]);
    }
  }, []);

  useEffect(() => {
    follows.current = ids.length;
    if (ids.length > 0) check();
  }, [ids.length, check]);

  const current = queue[0] ?? null;
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);

  const value = useMemo(() => ({ check }), [check]);
  return (
    <TrophyContext.Provider value={value}>
      {children}
      {current && (
        <TrophyBanner
          trophy={current}
          onPress={() => {
            setQueue([]);
            router.navigate('/play/trophies');
          }}
        />
      )}
    </TrophyContext.Provider>
  );
}

function TrophyBanner({ trophy, onPress }: { trophy: Trophy; onPress: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Trophy unlocked: ${trophy.title}. ${trophy.description}. Tap to see trophies.`}
        onPress={onPress}
        style={[styles.banner, { backgroundColor: colors.surfaceRaised, borderColor: colors.accent, shadowColor: colors.shadow }]}>
        <AppText variant="title">🏆</AppText>
        <View style={styles.text}>
          <AppText variant="kicker" color="accent">
            TROPHY UNLOCKED
          </AppText>
          <AppText variant="bodyStrong">{trophy.title}</AppText>
          <AppText variant="caption" color="textSecondary">
            {trophy.description}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}

export function useTrophies(): TrophyState {
  const ctx = useContext(TrophyContext);
  if (!ctx) throw new Error('useTrophies must be used inside <TrophyProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: 440,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flex: 1, gap: 1 },
});
