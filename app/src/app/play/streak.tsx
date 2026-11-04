import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import { FirstLoad } from '@/components/DataStatus';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import { loadStreakStats, saveStreakStats } from '@/game/storage';
import { useTrophies } from '@/game/TrophyProvider';
import {
  EMPTY_STREAK_STATS,
  endRun,
  isRight,
  level,
  nextRound,
  streakPool,
  type Guess,
  type StreakRound,
  type StreakStats,
} from '@/game/streak';
import { formatStat } from '@/lib/format';
import { rightFeedback, wrongFeedback } from '@/lib/haptics';
import { usePlayerLink } from '@/lib/usePlayerLink';
import { CATALOG } from '@/stats/catalog';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

type Phase = 'ready' | 'guess' | 'right' | 'wrong';
const LEVEL_NAMES = ['Warm-up', 'Getting closer', 'Close calls', 'Coin flips'];
const ADVANCE_MS = 900;

export default function StreakScreen() {
  const { snapshot } = useData();
  const colors = useColors();
  const openPlayer = usePlayerLink();
  const trophies = useTrophies();
  const players = snapshot?.players.players;
  const pool = useMemo(() => (players ? streakPool(players) : []), [players]);

  const [stats, setStats] = useState<StreakStats>(EMPTY_STREAK_STATS);
  const [round, setRound] = useState<StreakRound | null>(null);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [newBest, setNewBest] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadStreakStats(AsyncStorage).then((saved) => {
      if (!cancelled) setStats(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // After a right answer, show the number briefly, then deal the next round.
  useEffect(() => {
    if (phase !== 'right' || !round) return;
    const t = setTimeout(() => {
      setRound(nextRound(pool, run, round));
      setPhase('guess');
    }, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [phase, round, run, pool]);

  if (!snapshot) return <FirstLoad />;

  function start() {
    setRun(0);
    setNewBest(false);
    setRound(nextRound(pool, 0));
    setPhase('guess');
  }

  function answer(guess: Guess) {
    if (!round || phase !== 'guess') return;
    if (isRight(round, guess)) {
      rightFeedback();
      setRun((r) => r + 1);
      setPhase('right');
    } else {
      wrongFeedback();
      const updated = endRun(stats, run);
      setNewBest(run > 0 && run > stats.best);
      setStats(updated);
      saveStreakStats(AsyncStorage, updated).then(() => trophies.check());
      setPhase('wrong');
    }
  }

  const revealed = phase === 'right' || phase === 'wrong';
  const lvl = level(run);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.scoreRow}>
        <Score label="Streak" value={run} highlight={phase !== 'ready'} />
        <Score label="Best" value={Math.max(stats.best, run)} />
        <Score label="Runs" value={stats.runs} />
      </View>

      {phase === 'ready' || !round ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <AppText variant="title">How it works</AppText>
          <AppText color="textSecondary">
            You see one player’s season average. Is the next player’s higher or lower? Get it right and they become
            the player to beat, with a new stat. Every 4 in a row, the numbers get closer. One miss ends the run.
          </AppText>
          {pool.length < 2 ? (
            <AppText color="textSecondary">Not enough qualified players yet. Check back after a few more games.</AppText>
          ) : (
            <PrimaryButton label={stats.runs > 0 ? 'Start a run' : 'Start'} onPress={start} />
          )}
        </View>
      ) : (
        <>
          <View style={styles.statHead}>
            <AppText variant="kicker" color="textSecondary">
              LEVEL {lvl + 1} · {LEVEL_NAMES[lvl].toUpperCase()}
            </AppText>
            <AppText variant="title" style={styles.centerText}>
              {CATALOG[round.stat].label}
            </AppText>
          </View>

          <PlayerPanel player={round.known} value={formatStat(round.stat, round.known.s[round.stat])} />
          <AppText variant="small" color="textSecondary" style={styles.centerText}>
            {phase === 'guess' ? `Does ${round.mystery.name} have more or less?` : ' '}
          </AppText>
          <PlayerPanel
            player={round.mystery}
            value={revealed ? formatStat(round.stat, round.mystery.s[round.stat]) : '?'}
            mark={phase === 'right' ? 'right' : phase === 'wrong' ? 'wrong' : null}
          />

          {phase === 'wrong' ? (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <AppText variant="title">{newBest ? `New best: ${run}!` : `Run over at ${run}`}</AppText>
              <AppText color="textSecondary">
                {round.mystery.name} has {formatStat(round.stat, round.mystery.s[round.stat])},{' '}
                {isRight(round, 'higher') ? 'more' : 'less'} than {round.known.name}’s{' '}
                {formatStat(round.stat, round.known.s[round.stat])}.
              </AppText>
              <PrimaryButton label="Play again" onPress={start} />
              <View style={styles.actions}>
                <SecondaryButton
                  label="Share"
                  style={styles.flex}
                  onPress={() =>
                    Share.share({ message: `Hoops Higher or Lower: a streak of ${run}. Best ${Math.max(stats.best, run)}.` })
                  }
                />
                <SecondaryButton
                  label={round.mystery.name.split(' ').slice(-1)[0]}
                  accessibilityLabel={`Open ${round.mystery.name}`}
                  style={styles.flex}
                  onPress={() => openPlayer(round.mystery.id)}
                />
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <GuessButton label="▲ Higher" disabled={phase !== 'guess'} onPress={() => answer('higher')} />
              <GuessButton label="▼ Lower" disabled={phase !== 'guess'} onPress={() => answer('lower')} />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Score({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.scoreItem}>
      <AppText variant="large" color={highlight ? 'accent' : 'text'} style={styles.tabular}>
        {value}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function PlayerPanel({ player, value, mark = null }: { player: Player; value: string; mark?: 'right' | 'wrong' | null }) {
  const colors = useColors();
  const border = mark === 'right' ? colors.success : mark === 'wrong' ? colors.danger : colors.surface;
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: border }]}>
      <View style={styles.panelText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {player.name}
        </AppText>
        <View style={styles.meta}>
          <TeamChip abbr={player.team} />
          <AppText variant="caption" color="textSecondary">
            {player.pos}
          </AppText>
        </View>
      </View>
      <AppText variant="large" style={styles.tabular} accessibilityLabel={value === '?' ? 'hidden' : value}>
        {value}
      </AppText>
      {mark && (
        <AppText variant="title" color={mark === 'right' ? 'text' : 'danger'} accessibilityLabel={mark}>
          {mark === 'right' ? '✓' : '✗'}
        </AppText>
      )}
    </View>
  );
}

function GuessButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.guess,
        { backgroundColor: colors.accentFill, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}>
      <AppText variant="title" color="textOnAccent">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  centerText: { textAlign: 'center' },
  scoreRow: { flexDirection: 'row' },
  scoreItem: { flex: 1, alignItems: 'center' },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  statHead: { alignItems: 'center', gap: 2 },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.lg,
    minHeight: 84,
  },
  panelText: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  guess: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 64, borderRadius: radius.lg },
});
