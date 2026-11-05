import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { FirstLoad } from '@/components/DataStatus';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Puzzle, PuzzlePoolEntry } from '@/data/types';
import {
  isDoublePoints,
  MAX_CLUES,
  MAX_GUESSES,
  pointsAvailable,
  puzzleFor,
  score,
  shareText,
  wrongGuesses,
  type DailyStats,
  type GameState,
} from '@/game/daily';
import { useDailyGame, useToday } from '@/game/useDailyGame';
import type { ChartPoint } from '@/graphs/math';
import { ScatterChart } from '@/graphs/ScatterChart';
import { fold } from '@/lib/fold';
import { formatDate } from '@/lib/format';
import { CATALOG, type StatId } from '@/stats/catalog';
import { radius, spacing, touchSlop } from '@/theme/tokens';
import { useChartColors, useColors } from '@/theme/useTokens';

const MAX_SUGGESTIONS = 6;

function poolValue(entry: PuzzlePoolEntry, stat: StatId): number | null {
  switch (stat) {
    case 'age':
      return entry.age;
    case 'pts':
      return entry.pts;
    case 'ast':
      return entry.ast;
    case 'reb':
      return entry.reb;
    case 'stl':
      return entry.stl;
    case 'blk':
      return entry.blk;
    default:
      return null;
  }
}

function poolPoints(puzzle: Puzzle, y: StatId): ChartPoint[] {
  return puzzle.pool.flatMap((e) => {
    const x = poolValue(e, puzzle.xStat);
    const v = poolValue(e, y);
    return x == null || v == null ? [] : [{ id: e.id, name: e.name, x, y: v, z: null }];
  });
}

export default function DailyScreen() {
  const { snapshot } = useData();
  const colors = useColors();
  const today = useToday();
  const puzzle = snapshot ? puzzleFor(snapshot.puzzles.puzzles, today) : null;
  const game = useDailyGame(puzzle);

  if (!snapshot) return <FirstLoad />;
  if (!puzzle) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText color="textSecondary">No puzzle yet. Pull to refresh on the Players tab, or check back later.</AppText>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      <View style={styles.titleBlock}>
        <AppText variant="title">
          Puzzle #{puzzle.number} · {formatDate(puzzle.date)}
        </AppText>
        <AppText variant="small" color="textSecondary">
          The highlighted dot marked “?” is a mystery player among the season’s top {puzzle.pool.length} scorers. Switch stats to
          see where they stand, then guess who it is.
        </AppText>
        {puzzle.date !== today && (
          <AppText variant="caption" color="danger">
            Today’s puzzle hasn’t been published yet, so this is the most recent one.
          </AppText>
        )}
      </View>
      {isDoublePoints(puzzle.date) && (
        <View style={[styles.banner, { backgroundColor: colors.accentFill }]}>
          <AppText variant="bodyStrong" color="textOnAccent">
            Double points today
          </AppText>
        </View>
      )}
      {game.state ? (
        <Game puzzle={puzzle} state={game.state} stats={game.stats} onGuess={game.guess} onClue={game.revealClue} />
      ) : null}
    </ScrollView>
  );
}

function Game({
  puzzle,
  state,
  stats,
  onGuess,
  onClue,
}: {
  puzzle: Puzzle;
  state: GameState;
  stats: DailyStats;
  onGuess: (id: number) => void;
  onClue: () => void;
}) {
  const colors = useColors();
  const cc = useChartColors();
  const { playerById } = useData();
  const [hint, setHint] = useState<StatId>(puzzle.hintStats[0] ?? 'pts');
  const [tapped, setTapped] = useState<string | null>(null);
  const points = useMemo(() => poolPoints(puzzle, hint), [puzzle, hint]);
  const done = state.status !== 'playing';
  const answer = puzzle.pool.find((e) => e.id === puzzle.answerId);
  const nameById = new Map(puzzle.pool.map((e) => [e.id, e.name]));

  return (
    <>
      <View style={styles.chips}>
        {puzzle.hintStats.map((id) => {
          const selected = id === hint;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${CATALOG[id].label}`}
              onPress={() => setHint(id)}
              hitSlop={touchSlop}
              style={[styles.chip, { backgroundColor: selected ? colors.accentFill : colors.surface }]}>
              <AppText variant="small" color={selected ? 'textOnAccent' : 'text'} style={styles.bold}>
                {CATALOG[id].short}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <ScatterChart
        points={points}
        xStat={puzzle.xStat}
        yStat={hint}
        color={(p) => (p.id === puzzle.answerId ? cc.highlight : cc.neutral)}
        highlightIds={[puzzle.answerId]}
        labels={[{ id: puzzle.answerId, text: done && answer ? answer.name : '?' }]}
        summary={`${CATALOG[hint].label} against ${CATALOG[puzzle.xStat].label.toLowerCase()} for the top ${puzzle.pool.length} scorers. The mystery player is the highlighted dot.`}
        onSelect={(id) =>
          setTapped(
            id === puzzle.answerId && !done
              ? 'That’s the mystery player.'
              : `That dot is ${nameById.get(id) ?? 'unknown'}.`,
          )
        }
      />
      <AppText variant="caption" color="textSecondary">
        {tapped ?? `${CATALOG[hint].label} against ${CATALOG[puzzle.xStat].label.toLowerCase()}. Tap any gray dot to see who it is.`}
      </AppText>

      <Clues puzzle={puzzle} state={state} onClue={onClue} />

      {done ? (
        <Result puzzle={puzzle} state={state} stats={stats} answerName={answer?.name ?? 'Unknown'} canOpen={playerById.has(puzzle.answerId)} />
      ) : (
        <GuessBox puzzle={puzzle} state={state} onGuess={onGuess} />
      )}
    </>
  );
}

function Clues({ puzzle, state, onClue }: { puzzle: Puzzle; state: GameState; onClue: () => void }) {
  const colors = useColors();
  const done = state.status !== 'playing';
  const showFirst = state.clues >= 1 || done;
  const showSecond = state.clues >= 2 || done;
  const nextWorth = pointsAvailable({ ...state, clues: Math.min(MAX_CLUES, state.clues + 1) });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <AppText variant="bodyStrong">Clues</AppText>
      <View style={styles.clueRow}>
        <AppText variant="small" color="textSecondary" style={styles.clueLabel}>
          Position and conference
        </AppText>
        {showFirst ? (
          <AppText variant="bodyStrong">
            {positionName(puzzle.clues.position)} · {puzzle.clues.conference}
          </AppText>
        ) : (
          <AppText variant="small" color="textSecondary">
            Hidden
          </AppText>
        )}
      </View>
      <View style={styles.clueRow}>
        <AppText variant="small" color="textSecondary" style={styles.clueLabel}>
          Team
        </AppText>
        {showSecond ? <TeamChip abbr={puzzle.clues.team} /> : (
          <AppText variant="small" color="textSecondary">
            Hidden
          </AppText>
        )}
      </View>
      {!done && state.clues < MAX_CLUES && (
        <Pressable
          accessibilityRole="button"
          onPress={onClue}
          style={[styles.secondaryButton, { borderColor: colors.border }]}>
          <AppText variant="bodyStrong" color="accent">
            Reveal a clue · then worth {nextWorth} {nextWorth === 1 ? 'point' : 'points'}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

function GuessBox({ puzzle, state, onGuess }: { puzzle: Puzzle; state: GameState; onGuess: (id: number) => void }) {
  const colors = useColors();
  const [text, setText] = useState('');
  const needle = fold(text);
  const suggestions = needle
    ? puzzle.pool.filter((e) => e.searchName.includes(needle) && !state.guesses.includes(e.id)).slice(0, MAX_SUGGESTIONS)
    : [];
  const left = MAX_GUESSES - state.guesses.length;
  const worth = pointsAvailable(state) - wrongGuesses(state, puzzle);

  return (
    <View style={styles.guessBlock}>
      <AppText variant="small" color="textSecondary">
        {left} {left === 1 ? 'guess' : 'guesses'} left · a correct guess now scores {worth}{' '}
        {Math.abs(worth) === 1 ? 'point' : 'points'}
      </AppText>
      {state.guesses.map((id) => (
        <View key={id} style={styles.wrongRow}>
          <AppText variant="small" color="danger" style={styles.bold}>
            ✗
          </AppText>
          <AppText variant="small">{puzzle.pool.find((e) => e.id === id)?.name ?? 'Unknown'}</AppText>
        </View>
      ))}
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Type a player’s name"
        placeholderTextColor={colors.textSecondary}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel="Guess a player"
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
      />
      {needle !== '' && suggestions.length === 0 && (
        <AppText variant="caption" color="textSecondary">
          No top scorer matches “{text}”. The answer is one of the dots on the chart.
        </AppText>
      )}
      {suggestions.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          accessibilityLabel={`Guess ${e.name}`}
          onPress={() => {
            onGuess(e.id);
            setText('');
          }}
          style={({ pressed }) => [
            styles.suggestion,
            { backgroundColor: pressed ? colors.border : colors.surface },
          ]}>
          <AppText variant="body" style={styles.flex}>
            {e.name}
          </AppText>
          <AppText variant="small" color="accent" style={styles.bold}>
            Guess
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

function Result({
  puzzle,
  state,
  stats,
  answerName,
  canOpen,
}: {
  puzzle: Puzzle;
  state: GameState;
  stats: DailyStats;
  answerName: string;
  canOpen: boolean;
}) {
  const colors = useColors();
  const won = state.status === 'won';
  const pts = score(state, puzzle);
  const winRate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <AppText variant="title" color={won ? 'text' : 'danger'}>
        {won ? 'Correct!' : 'Out of guesses'}
      </AppText>
      <View style={styles.answerRow}>
        <AppText variant="bodyStrong" style={styles.flex}>
          {answerName}
        </AppText>
        <TeamChip abbr={puzzle.clues.team} />
      </View>
      <AppText variant="small" color="textSecondary">
        {pts} {Math.abs(pts) === 1 ? 'point' : 'points'} today. A new puzzle unlocks at midnight.
      </AppText>

      <View style={styles.statsRow}>
        <Stat label="Played" value={String(stats.played)} />
        <Stat label="Won" value={`${winRate}%`} />
        <Stat label="Streak" value={String(stats.currentStreak)} />
        <Stat label="Best" value={String(stats.bestStreak)} />
        <Stat label="Total" value={String(stats.totalScore)} />
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => Share.share({ message: shareText(state, puzzle) })}
          style={[styles.primaryButton, { backgroundColor: colors.accentFill }]}>
          <AppText variant="bodyStrong" color="textOnAccent">
            Share result
          </AppText>
        </Pressable>
        {canOpen && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/play/player/[id]', params: { id: String(puzzle.answerId) } })}
            style={[styles.secondaryButton, styles.flex, { borderColor: colors.border }]}>
            <AppText variant="bodyStrong" color="accent">
              Player page
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function positionName(pos: string): string {
  return { G: 'Guard', F: 'Forward', C: 'Center' }[pos] ?? pos;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  titleBlock: { gap: spacing.xs },
  banner: { borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.pill },
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  clueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 28 },
  clueLabel: { flex: 1 },
  guessBlock: { gap: spacing.sm },
  wrongRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: { height: 44, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 16 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
