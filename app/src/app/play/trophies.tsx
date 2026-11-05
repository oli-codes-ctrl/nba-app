import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Section } from '@/components/Section';
import { progress, TROPHIES, type Trophy } from '@/game/trophies';
import { useTrophyFacts } from '@/game/useTrophyFacts';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

const GAMES: Trophy['game'][] = ['Daily Guess', 'Higher or Lower', 'Who Has More?', 'Box Score Mystery', 'Explore'];

export default function TrophiesScreen() {
  const colors = useColors();
  const facts = useTrophyFacts();
  if (!facts) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const earned = TROPHIES.filter((t) => facts.career.unlocked[t.id]).length;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={[styles.summary, { backgroundColor: colors.surface }]}>
        <AppText variant="large">
          {earned} of {TROPHIES.length}
        </AppText>
        <AppText color="textSecondary">trophies earned. Once earned, a trophy is yours to keep.</AppText>
        <Bar value={earned / TROPHIES.length} />
      </View>

      {GAMES.map((game) => (
        <Section key={game} title={game}>
          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {TROPHIES.filter((t) => t.game === game).map((t, i) => {
              const date = facts.career.unlocked[t.id];
              const current = Math.min(t.current(facts), t.target);
              return (
                <View
                  key={t.id}
                  accessible
                  accessibilityLabel={`${t.title}. ${t.description}. ${date ? `Earned ${formatDate(date)}` : `${current} of ${t.target}`}`}
                  style={[styles.row, i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <Medal earned={!!date} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" color={date ? 'text' : 'textSecondary'}>
                      {t.title}
                    </AppText>
                    <AppText variant="small" color="textSecondary">
                      {t.description}
                    </AppText>
                    {date ? (
                      <AppText variant="caption" color="accent">
                        Earned {formatDate(date)}
                      </AppText>
                    ) : t.target > 1 ? (
                      <View style={styles.progress}>
                        <Bar value={progress(t, facts)} />
                        <AppText variant="caption" color="textSecondary" style={styles.count}>
                          {current}/{t.target}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </Section>
      ))}
    </ScrollView>
  );
}

/** Earned: a filled accent medal with a check. Locked: an empty ring. Drawn, not emoji, so it matches the system in both modes. */
function Medal({ earned }: { earned: boolean }) {
  const colors = useColors();
  return earned ? (
    <View style={[styles.medal, { backgroundColor: colors.accentFill }]}>
      <AppText variant="bodyStrong" color="textOnAccent">
        ✓
      </AppText>
    </View>
  ) : (
    <View style={[styles.medal, styles.medalLocked, { borderColor: colors.textSecondary }]} />
  );
}

function Bar({ value }: { value: number }) {
  const colors = useColors();
  return (
    <View style={[styles.track, { backgroundColor: colors.scaleTrack }]}>
      <View style={[styles.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1, gap: 2 },
  summary: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  list: { borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, alignItems: 'flex-start' },
  medal: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  medalLocked: { borderWidth: 2 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  count: { minWidth: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
