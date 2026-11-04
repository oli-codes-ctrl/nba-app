import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import { FirstLoad } from '@/components/DataStatus';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import {
  EMPTY_MYSTERY_STATS,
  finishQuiz,
  makeQuiz,
  mysteryPool,
  mysteryShareText,
  type MysteryKind,
  type MysteryStats,
  type Quiz,
} from '@/game/mystery';
import { loadMysteryStats, saveMysteryStats } from '@/game/storage';
import { useTrophies } from '@/game/TrophyProvider';
import { formatDate, formatStat } from '@/lib/format';
import { rightFeedback, wrongFeedback } from '@/lib/haptics';
import { usePlayerLink } from '@/lib/usePlayerLink';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

const ADVANCE_MS = 1100;

export default function MysteryScreen() {
  const { snapshot } = useData();
  const colors = useColors();
  const openPlayer = usePlayerLink();
  const trophies = useTrophies();

  const [stats, setStats] = useState<MysteryStats>(EMPTY_MYSTERY_STATS);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [marks, setMarks] = useState<boolean[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadMysteryStats(AsyncStorage).then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = quiz?.questions.length ?? 0;
  const done = quiz != null && marks.length === total && picked == null;

  // After an answer, pause on the reveal, then move on (or finish).
  useEffect(() => {
    if (picked == null || !quiz) return;
    const t = setTimeout(() => {
      setPicked(null);
      if (index + 1 < quiz.questions.length) setIndex(index + 1);
    }, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [picked, index, quiz]);

  if (!snapshot) return <FirstLoad />;
  const players = snapshot.players.players;
  const kindNow = mysteryPool(players).kind;

  function start() {
    setQuiz(makeQuiz(players));
    setIndex(0);
    setPicked(null);
    setMarks([]);
  }

  function pick(id: number) {
    if (!quiz || picked != null || marks.length > index) return;
    const right = id === quiz.questions[index].answer.id;
    if (right) rightFeedback();
    else wrongFeedback();
    const nextMarks = [...marks, right];
    setPicked(id);
    setMarks(nextMarks);
    if (nextMarks.length === quiz.questions.length) {
      const score = nextMarks.filter(Boolean).length;
      const updated = finishQuiz(stats, score, nextMarks.length);
      setStats(updated);
      saveMysteryStats(AsyncStorage, updated).then(() => trophies.check());
    }
  }

  const score = marks.filter(Boolean).length;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      {!quiz ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <AppText variant="title">Whose line is it?</AppText>
          <AppText color="textSecondary">
            {kindNow === 'game'
              ? `Ten real box lines from the latest games (since ${formatDate(snapshot.players.latest?.since ?? snapshot.manifest.asOf)}). Pick who posted each one from four names.`
              : 'Ten players’ season averages. Pick who each line belongs to from four names. Once last night’s games are in, the quiz switches to real box lines.'}
          </AppText>
          <View style={styles.statsRow}>
            <Mini label="Best" value={stats.played ? `${stats.best}/10` : '–'} />
            <Mini label="Played" value={String(stats.played)} />
            <Mini label="Perfect" value={String(stats.perfect)} />
          </View>
          <PrimaryButton label="Start" onPress={start} />
        </View>
      ) : done ? (
        <View style={styles.doneBlock}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <AppText variant="large">
              {score}/{total}
            </AppText>
            <AppText color="textSecondary">
              {score === total ? 'Perfect. You know your box scores.' : score >= 8 ? 'Sharp.' : score >= 5 ? 'Not bad.' : 'Tough set.'} Best{' '}
              {stats.best}/10.
            </AppText>
            <AppText variant="bodyStrong">{marks.map((m) => (m ? '🟩' : '🟥')).join('')}</AppText>
            <PrimaryButton label="Play again" onPress={start} />
            <SecondaryButton label="Share" onPress={() => Share.share({ message: mysteryShareText(marks) })} />
          </View>
          <AppText variant="title">The answers</AppText>
          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {quiz.questions.map((q, i) => (
              <Pressable
                key={q.answer.id}
                accessibilityRole="button"
                onPress={() => openPlayer(q.answer.id)}
                style={[styles.answerRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="bodyStrong" color={marks[i] ? 'text' : 'danger'}>
                  {marks[i] ? '✓' : '✗'}
                </AppText>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {q.answer.name}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {headline(q.answer, quiz.kind)}
                  </AppText>
                </View>
                <TeamChip abbr={q.answer.team} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <Question
          kind={quiz.kind}
          number={index + 1}
          total={total}
          marks={marks}
          answer={quiz.questions[index].answer}
          options={quiz.questions[index].options}
          picked={picked}
          onPick={pick}
        />
      )}
    </ScrollView>
  );
}

function headline(p: Player, kind: MysteryKind): string {
  if (kind === 'game' && p.g) return `${p.g.pts ?? 0} PTS · ${p.g.reb ?? 0} REB · ${p.g.ast ?? 0} AST`;
  return `${formatStat('pts', p.s.pts)} PTS · ${formatStat('reb', p.s.reb)} REB · ${formatStat('ast', p.s.ast)} AST`;
}

function LineCard({ player, kind }: { player: Player; kind: MysteryKind }) {
  const colors = useColors();
  const g = player.g;
  const s = player.s;
  const rows =
    kind === 'game' && g
      ? [
          [`${g.pts ?? 0}`, 'PTS'], [`${g.reb ?? 0}`, 'REB'], [`${g.ast ?? 0}`, 'AST'],
          [`${g.stl ?? 0}`, 'STL'], [`${g.blk ?? 0}`, 'BLK'], [`${g.tov ?? 0}`, 'TOV'],
        ]
      : [
          [formatStat('pts', s.pts), 'PTS'], [formatStat('reb', s.reb), 'REB'], [formatStat('ast', s.ast), 'AST'],
          [formatStat('stl', s.stl), 'STL'], [formatStat('blk', s.blk), 'BLK'], [formatStat('tov', s.tov), 'TOV'],
        ];
  const foot =
    kind === 'game' && g
      ? `${g.fgm ?? 0}-${g.fga ?? 0} FG · ${g.fg3m ?? 0}-${g.fg3a ?? 0} 3PT · ${g.ftm ?? 0}-${g.fta ?? 0} FT · ${g.mpg ?? 0} min`
      : `${formatStat('fg_pct', s.fg_pct)} FG · ${formatStat('fg3_pct', s.fg3_pct)} 3PT · ${formatStat('mpg', s.mpg)} min · ${s.gp} games · ${player.pos}`;
  return (
    <View style={[styles.lineCard, { backgroundColor: colors.surface }]}>
      <AppText variant="caption" color="textSecondary" style={styles.kicker}>
        {kind === 'game' ? 'LATEST GAME' : 'SEASON AVERAGES'}
      </AppText>
      <View style={styles.grid}>
        {rows.map(([v, label]) => (
          <View key={label} style={styles.cell}>
            <AppText variant="large" style={styles.tabular}>
              {v}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {label}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="small" color="textSecondary" style={styles.center}>
        {foot}
      </AppText>
    </View>
  );
}

function Question({
  kind,
  number,
  total,
  marks,
  answer,
  options,
  picked,
  onPick,
}: {
  kind: MysteryKind;
  number: number;
  total: number;
  marks: boolean[];
  answer: Player;
  options: Player[];
  picked: number | null;
  onPick: (id: number) => void;
}) {
  const colors = useColors();
  const revealed = picked != null;
  return (
    <>
      <View style={styles.progressRow}>
        <AppText variant="bodyStrong">
          {number} of {total}
        </AppText>
        <View style={styles.dots}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < marks.length ? (marks[i] ? colors.scaleHigh : colors.danger) : i === number - 1 ? colors.accent : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>
      <LineCard player={answer} kind={kind} />
      <AppText variant="small" color="textSecondary" style={styles.center}>
        Who posted this line?
      </AppText>
      <View style={styles.options}>
        {options.map((p) => {
          const isAnswer = p.id === answer.id;
          const isPicked = p.id === picked;
          const border = revealed && isAnswer ? colors.scaleHigh : revealed && isPicked ? colors.danger : colors.border;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityState={{ disabled: revealed, selected: isPicked }}
              accessibilityLabel={revealed ? `${p.name}${isAnswer ? ', correct answer' : ''}` : p.name}
              disabled={revealed}
              onPress={() => onPick(p.id)}
              style={({ pressed }) => [
                styles.option,
                { borderColor: border, backgroundColor: pressed ? colors.border : colors.surface },
              ]}>
              <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {p.name}
              </AppText>
              {revealed && <TeamChip abbr={p.team} />}
              {revealed && (isAnswer || isPicked) && (
                <AppText variant="bodyStrong" color={isAnswer ? 'text' : 'danger'}>
                  {isAnswer ? '✓' : '✗'}
                </AppText>
              )}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.mini}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  kicker: { fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  statsRow: { flexDirection: 'row' },
  mini: { flex: 1, alignItems: 'center' },
  doneBlock: { gap: spacing.md },
  list: { borderRadius: radius.lg, overflow: 'hidden' },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  lineCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  cell: { width: '33.33%', alignItems: 'center' },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
  },
});
