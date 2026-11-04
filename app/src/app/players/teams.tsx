import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { FirstLoad } from '@/components/DataStatus';
import { Section } from '@/components/Section';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import { useLinks } from '@/lib/usePlayerLink';
import { formatStat } from '@/lib/format';
import { roster, teamLeader, teamsByConference } from '@/teams/team';
import { LuckCard, RatingsCard } from '@/teams/TeamCharts';
import { teamInfo } from '@/theme/teams';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

export default function TeamsScreen() {
  const { snapshot } = useData();
  const colors = useColors();
  const links = useLinks();
  const players = snapshot?.players.players;
  const conferences = useMemo(() => (players ? teamsByConference(players) : []), [players]);

  if (!snapshot || !players) return <FirstLoad />;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <RatingsCard doc={snapshot.teams} onSelect={links.team} />
      <LuckCard doc={snapshot.teams} onSelect={links.team} />
      {conferences.map(({ conf, teams }) => (
        <Section key={conf} title={`${conf}ern Conference`}>
          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {teams.map((abbr, i) => {
              const top = teamLeader(roster(players, abbr), 'game_score');
              return (
                <Pressable
                  key={abbr}
                  accessibilityRole="button"
                  accessibilityLabel={`${teamInfo(abbr).name}${top ? `, top player ${top.name}` : ''}`}
                  onPress={() => links.team(abbr)}
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                    pressed && { backgroundColor: colors.border },
                  ]}>
                  <TeamChip abbr={abbr} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{teamInfo(abbr).name}</AppText>
                    {top && (
                      <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                        Top player: {top.name} · {formatStat('game_score', top.s.game_score)} Game Score
                      </AppText>
                    )}
                  </View>
                  <AppText variant="bodyStrong" color="accent">
                    ›
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Section>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  list: { borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
});
