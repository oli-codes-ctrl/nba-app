import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { FirstLoad } from '@/components/DataStatus';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import {
  addRound,
  COMPARE_STATS,
  comparePool,
  EMPTY_SCORE,
  grade,
  isComplete,
  MIN_MPG,
  newRound,
  roundPoints,
  seededRandom,
  type Answers,
  type CompareScore,
  type Round,
  type Side,
  type StatResult,
} from '@/game/compare';
import { loadCompareScore, saveCompareScore } from '@/game/storage';
import { formatStat } from '@/lib/format';
import { CATALOG } from '@/stats/catalog';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

export default function CompareScreen() {
  const { snapshot } = useData();
  const colors = useColors();
  const players = snapshot?.players.players;
  const pool = useMemo(() => (players ? comparePool(players) : []), [players]);

  const [round, setRound] = useState<Round | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [results, setResults] = useState<StatResult[] | null>(null);
  const [total, setTotal] = useState<CompareScore>(EMPTY_SCORE);

  useEffect(() => {
    let cancelled = false;
    loadCompareScore(AsyncStorage).then((saved) => {
      if (!cancelled) setTotal(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The first round is seeded from the data refresh so rendering stays pure;
  // later rounds are dealt at random when you tap Next or Skip.
  const seed = snapshot?.manifest.generatedAt ?? '';
  const firstRound = useMemo(() => newRound(pool, seededRandom(seed)), [pool, seed]);
  const active = round ?? firstRound;

  if (!snapshot) return <FirstLoad />;
  if (!active) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText color="textSecondary">Not enough qualified players yet. Check back after a few more games.</AppText>
      </View>
    );
  }

  const submitted = results != null;
  const points = results ? roundPoints(active, results) : 0;

  function submit() {
    if (!active || !isComplete(answers)) return;
    const graded = grade(active, answers);
    setResults(graded);
    const next = addRound(total, roundPoints(active, graded));
    setTotal(next);
    saveCompareScore(AsyncStorage, next);
  }

  function nextRound() {
    setRound(newRound(pool));
    setAnswers({});
    setResults(null);
  }

  function resetScore() {
    Alert.alert('Reset your score?', 'This sets your running score and rounds back to zero.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setTotal(EMPTY_SCORE);
          saveCompareScore(AsyncStorage, EMPTY_SCORE);
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.scoreRow}>
        <ScoreItem label="Score" value={String(total.score)} />
        <ScoreItem label="Rounds" value={String(total.rounds)} />
        <ScoreItem label="Best round" value={String(total.best)} />
      </View>

      <AppText variant="small" color="textSecondary">
        Two players who average {MIN_MPG}+ minutes. For each stat, pick who has more. Right answers score 1,
        wrong ones cost 1, and ties count as right.
      </AppText>

      {active.double && (
        <View style={[styles.banner, { backgroundColor: colors.accent }]}>
          <AppText variant="bodyStrong" color="textOnAccent">
            Double points: right answers score 2
          </AppText>
        </View>
      )}

      <View style={styles.players}>
        <PlayerCard player={active.a} />
        <AppText variant="small" color="textSecondary" style={styles.vs}>
          vs.
        </AppText>
        <PlayerCard player={active.b} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {COMPARE_STATS.map((stat, i) => (
          <StatQuestion
            key={stat}
            first={i === 0}
            label={CATALOG[stat].label}
            round={active}
            picked={answers[stat]}
            result={results?.find((r) => r.stat === stat)}
            onPick={(side) => !submitted && setAnswers((a) => ({ ...a, [stat]: side }))}
          />
        ))}
      </View>

      {submitted ? (
        <View style={styles.after}>
          <AppText variant="title">
            {points > 0 ? '+' : ''}
            {points} {Math.abs(points) === 1 ? 'point' : 'points'} this round
          </AppText>
          <View style={styles.actions}>
            <PrimaryButton label="Next round" onPress={nextRound} />
          </View>
          <View style={styles.actions}>
            <SecondaryButton label={`Open ${active.a.name}`} onPress={() => openPlayer(active.a)} />
            <SecondaryButton label={`Open ${active.b.name}`} onPress={() => openPlayer(active.b)} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <PrimaryButton
            label={isComplete(answers) ? 'Check answers' : `Answer all ${COMPARE_STATS.length} to check`}
            disabled={!isComplete(answers)}
            onPress={submit}
          />
          <SecondaryButton label="Skip" onPress={nextRound} />
        </View>
      )}

      <Pressable accessibilityRole="button" onPress={resetScore} style={styles.reset}>
        <AppText variant="small" color="textSecondary">
          Reset score
        </AppText>
      </Pressable>
    </ScrollView>
  );
}

function openPlayer(p: Player) {
  router.push({ pathname: '/compare/player/[id]', params: { id: String(p.id) } });
}

function ScoreItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.scoreItem}>
      <AppText variant="large">{value}</AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const colors = useColors();
  return (
    <View style={[styles.playerCard, { backgroundColor: colors.surface }]}>
      <AppText variant="bodyStrong" numberOfLines={2} style={styles.center}>
        {player.name}
      </AppText>
      <TeamChip abbr={player.team} />
      <AppText variant="caption" color="textSecondary">
        {player.pos} · {formatStat('mpg', player.s.mpg)} min
      </AppText>
    </View>
  );
}

function StatQuestion({
  label,
  round,
  picked,
  result,
  onPick,
  first,
}: {
  label: string;
  round: Round;
  picked: Side | undefined;
  result: StatResult | undefined;
  onPick: (side: Side) => void;
  first: boolean;
}) {
  const colors = useColors();
  const sides: { side: Side; player: Player; value: number | null | undefined }[] = [
    { side: 'a', player: round.a, value: result?.a },
    { side: 'b', player: round.b, value: result?.b },
  ];
  const stat = result?.stat;

  return (
    <View style={[styles.question, !first && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.questionTop}>
        <AppText variant="small" style={styles.flex}>
          Who has more {label.toLowerCase()}?
        </AppText>
        {result && (
          <AppText variant="small" color={result.correct ? 'text' : 'danger'} style={styles.bold}>
            {result.correct ? '✓ Right' : '✗ Wrong'}
          </AppText>
        )}
      </View>
      <View style={styles.choices}>
        {sides.map(({ side, player, value }) => {
          const selected = picked === side;
          return (
            <Pressable
              key={side}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: result != null }}
              accessibilityLabel={`${player.name}${value != null && stat ? `, ${formatStat(stat, value)}` : ''}`}
              disabled={result != null}
              onPress={() => onPick(side)}
              style={[
                styles.choice,
                {
                  backgroundColor: selected ? colors.accent : colors.surfaceRaised,
                  borderColor: selected ? colors.accent : colors.border,
                },
              ]}>
              <AppText variant="small" color={selected ? 'textOnAccent' : 'text'} numberOfLines={1} style={styles.bold}>
                {player.name}
              </AppText>
              {value !== undefined && stat && (
                <AppText variant="number" color={selected ? 'textOnAccent' : 'text'}>
                  {formatStat(stat, value)}
                </AppText>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primary, { backgroundColor: disabled ? colors.border : colors.accent }]}>
      <AppText variant="bodyStrong" color={disabled ? 'textSecondary' : 'textOnAccent'}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.secondary, { borderColor: colors.border }]}>
      <AppText variant="bodyStrong" color="accent" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, textAlign: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  scoreRow: { flexDirection: 'row' },
  scoreItem: { flex: 1, alignItems: 'center' },
  banner: { borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  players: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vs: { width: 24, textAlign: 'center' },
  playerCard: { flex: 1, alignItems: 'center', gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, minHeight: 112 },
  card: { borderRadius: radius.lg, paddingHorizontal: spacing.md },
  question: { paddingVertical: spacing.md, gap: spacing.sm },
  questionTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  choices: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  after: { gap: spacing.md, alignItems: 'stretch' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  primary: { flex: 2, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md },
  secondary: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reset: { alignSelf: 'center', padding: spacing.sm },
});
