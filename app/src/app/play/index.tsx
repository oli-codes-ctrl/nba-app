import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DailyCard } from '@/components/DailyCard';
import { FirstLoad } from '@/components/DataStatus';
import { useData } from '@/data/DataProvider';
import { TROPHIES } from '@/game/trophies';
import { useGameProgress } from '@/game/useGameProgress';
import { useTrophyFacts } from '@/game/useTrophyFacts';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

export default function PlayHub() {
  const { snapshot } = useData();
  const colors = useColors();
  const { today, puzzle, progress } = useGameProgress();
  const facts = useTrophyFacts();

  if (!snapshot) return <FirstLoad />;

  const streak = progress?.streak;
  const compare = progress?.compare;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <DailyCard puzzle={puzzle} today={today} progress={progress} />

      <GameCard
        href="/play/streak"
        title="Higher or Lower"
        blurb="Is the next player’s number higher or lower? Keep the chain going as the gaps get smaller."
        stat={streak && streak.runs > 0 ? `Best streak ${streak.best}` : null}
      />
      <GameCard
        href="/play/compare"
        title="Who Has More?"
        blurb="Two starters, five stats: pick who has more of each."
        stat={compare && compare.rounds > 0 ? `Score ${compare.score} · ${compare.rounds} rounds` : null}
      />
      <GameCard
        href="/play/mystery"
        title="Box Score Mystery"
        blurb="Ten stat lines, four names each. Whose line is it?"
        stat={facts && facts.mystery.played > 0 ? `Best ${facts.mystery.best}/10` : null}
      />
      <GameCard
        href="/play/trophies"
        title="Trophies"
        blurb="Milestones across every game, from your first solve to a 30-day streak."
        stat={facts ? `${TROPHIES.filter((t) => facts.career.unlocked[t.id]).length} of ${TROPHIES.length} earned` : ' '}
      />

      <AppText variant="caption" color="textSecondary" style={styles.footnote}>
        Every game uses stats through last night. Scores stay on this phone.
      </AppText>
    </ScrollView>
  );
}

/** A game: title, one line on how it plays, and your best so far (or a New badge before your first try). */
function GameCard({ href, title, blurb, stat }: { href: Href; title: string; blurb: string; stat: string | null }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${stat ?? 'New'}`}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.border : colors.surface }]}>
      <View style={styles.cardTop}>
        <AppText variant="title">{title}</AppText>
        {stat == null && (
          <View style={[styles.badge, { borderColor: colors.accent }]}>
            <AppText variant="kicker" color="accent">
              New
            </AppText>
          </View>
        )}
        <View style={styles.flex} />
        <AppText variant="title" color="textSecondary">
          ›
        </AppText>
      </View>
      <AppText variant="small" color="textSecondary">
        {blurb}
      </AppText>
      {stat != null && (
        <AppText variant="small" style={styles.bold}>
          {stat}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  footnote: { textAlign: 'center' },
});
