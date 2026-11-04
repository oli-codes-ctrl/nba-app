import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Puzzle } from '@/data/types';
import { isDoublePoints, liveStreak, MAX_GUESSES, score } from '@/game/daily';
import type { Progress } from '@/game/useGameProgress';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { AppText } from './AppText';

/** Re-render every minute for the countdown. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function untilMidnight(now: Date): string {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.round((midnight.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

/** Today's puzzle at a glance, with the streak on the line. Tapping opens the game. */
export function DailyCard({
  puzzle,
  today,
  progress,
}: {
  puzzle: Puzzle | null;
  today: string;
  progress: Progress | null;
}) {
  const colors = useColors();
  const now = useMinuteClock();
  if (!puzzle) return null;

  const game = progress?.game ?? null;
  const streak = progress ? liveStreak(progress.daily, today) : 0;
  const status = game?.status ?? 'playing';
  const done = status !== 'playing';
  const guessesLeft = MAX_GUESSES - (game?.guesses.length ?? 0);
  const double = isDoublePoints(puzzle.date);

  let headline: string;
  let detail: string;
  if (status === 'won' && game) {
    const pts = score(game, puzzle);
    headline = `Solved · ${pts > 0 ? '+' : ''}${pts} ${Math.abs(pts) === 1 ? 'point' : 'points'}`;
    detail = `Next puzzle in ${untilMidnight(now)}`;
  } else if (status === 'lost') {
    headline = 'Missed it today';
    detail = `Next puzzle in ${untilMidnight(now)}`;
  } else if (game && game.guesses.length > 0) {
    headline = 'In progress';
    detail = `${guessesLeft} ${guessesLeft === 1 ? 'guess' : 'guesses'} left`;
  } else {
    headline = 'Name today’s mystery player';
    detail = streak > 0 ? `Play today to keep your ${streak}-day streak` : 'Three guesses. Clues cost points.';
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Daily Guess, puzzle ${puzzle.number}. ${headline}. ${detail}`}
      onPress={() => router.navigate('/play/daily')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: done ? colors.surface : colors.accentFill, opacity: pressed ? 0.9 : 1 },
      ]}>
      <View style={styles.top}>
        <AppText variant="kicker" color={done ? 'textSecondary' : 'textOnAccent'}>
          DAILY GUESS · #{puzzle.number}
        </AppText>
        {double && !done && (
          <View style={[styles.tag, { backgroundColor: colors.textOnAccent }]}>
            <AppText variant="caption" color="accentFill" style={styles.bold}>
              2× POINTS
            </AppText>
          </View>
        )}
      </View>
      <AppText variant="title" color={done ? 'text' : 'textOnAccent'}>
        {headline}
      </AppText>
      <View style={styles.bottom}>
        <AppText variant="small" color={done ? 'textSecondary' : 'textOnAccent'} style={styles.flex}>
          {detail}
        </AppText>
        {streak > 0 && (
          <AppText variant="bodyStrong" color={done ? 'text' : 'textOnAccent'} accessibilityLabel={`${streak}-day streak`}>
            🔥 {streak}
          </AppText>
        )}
        <AppText variant="bodyStrong" color={done ? 'accent' : 'textOnAccent'}>
          {done ? 'Result ›' : 'Play ›'}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  tag: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  bold: { fontWeight: '700' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  flex: { flex: 1 },
});
