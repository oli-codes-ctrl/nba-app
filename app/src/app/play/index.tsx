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
        blurb="One stat, two players. Is the next one higher or lower? Keep the chain going; it gets harder as you climb."
        stat={streak && streak.runs > 0 ? `Best streak ${streak.best}` : 'New'}
      />
      <GameCard
        href="/play/compare"
        title="Who Has More?"
        blurb="Two starters, five stats. Pick who has more of each. Right answers score, wrong ones cost."
        stat={compare && compare.rounds > 0 ? `Score ${compare.score} · ${compare.rounds} rounds` : 'New'}
      />
      <GameCard
        href="/play/mystery"
        title="Box Score Mystery"
        blurb="Ten stat lines, four names each. Whose line is it? Uses last night’s box scores when they’re in."
        stat={facts && facts.mystery.played > 0 ? `Best ${facts.mystery.best}/10` : 'New'}
      />
      <GameCard
        href="/play/trophies"
        title="🏆 Trophies"
        blurb="Milestones across every game, from your first solve to a 30-day streak."
        stat={facts ? `${TROPHIES.filter((t) => facts.career.unlocked[t.id]).length} of ${TROPHIES.length} earned` : ' '}
      />

      <AppText variant="caption" color="textSecondary" style={styles.footnote}>
        Every game uses stats through last night. Scores stay on this phone.
      </AppText>
    </ScrollView>
  );
}

function GameCard({ href, title, blurb, stat }: { href: Href; title: string; blurb: string; stat: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${stat}`}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.border : colors.surface }]}>
      <View style={styles.cardTop}>
        <AppText variant="title" style={styles.flex}>
          {title}
        </AppText>
        <AppText variant="bodyStrong" color="accent">
          ›
        </AppText>
      </View>
      <AppText variant="small" color="textSecondary">
        {blurb}
      </AppText>
      <AppText variant="small" style={styles.bold}>
        {stat}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  footnote: { textAlign: 'center' },
});
