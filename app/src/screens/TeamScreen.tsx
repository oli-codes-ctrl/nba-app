import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { FirstLoad } from '@/components/DataStatus';
import { Section } from '@/components/Section';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import { updateCareer } from '@/game/storage';
import { useTrophies } from '@/game/TrophyProvider';
import type { TeamSeason } from '@/data/types';
import { formatStat, ordinal } from '@/lib/format';
import { useLinks, usePlayerLink } from '@/lib/usePlayerLink';
import { CATALOG } from '@/stats/catalog';
import { factorRows } from '@/teams/analysis';
import { FourFactors } from '@/teams/FourFactors';
import { roster, TEAM_LEADER_STATS, teamLeader } from '@/teams/team';
import { LuckCard, RatingsCard, signed } from '@/teams/TeamCharts';
import { teamInfo } from '@/theme/teams';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

export default function TeamScreen() {
  const { abbr = '' } = useLocalSearchParams<{ abbr: string }>();
  const { snapshot, teamByAbbr } = useData();
  const colors = useColors();
  const openPlayer = usePlayerLink();
  const links = useLinks();
  const { check } = useTrophies();
  const players = snapshot?.players.players;
  const team = useMemo(() => (players ? roster(players, abbr) : []), [players, abbr]);

  // Count the visit toward the Scout trophy.
  useEffect(() => {
    if (!abbr) return;
    updateCareer(AsyncStorage, (c) =>
      c.teamsVisited.includes(abbr) ? c : { ...c, teamsVisited: [...c.teamsVisited, abbr] },
    ).then(() => check());
  }, [abbr, check]);

  if (!snapshot) return <FirstLoad shape="page" />;
  const info = teamInfo(abbr);
  const conf = team[0]?.conf;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: info.name }} />

      {/* Team color is an identity accent (the stripe and chip), never a background for text. */}
      <View style={[styles.hero, { backgroundColor: colors.surface }]}>
        <View style={[styles.stripe, { backgroundColor: info.color }]} />
        <View style={styles.heroText}>
          <View style={styles.heroTop}>
            <TeamChip abbr={abbr} />
            {conf ? (
              <AppText variant="kicker" color="textSecondary">
                {conf}ern Conference
              </AppText>
            ) : null}
          </View>
          <AppText variant="large">{info.name}</AppText>
          <AppText variant="small" color="textSecondary">
            {team.length} {team.length === 1 ? 'player' : 'players'} this season
          </AppText>
        </View>
      </View>

      {teamByAbbr.get(abbr) && <AtAGlance season={teamByAbbr.get(abbr)!} teams={teamByAbbr.size} />}

      {teamByAbbr.get(abbr) && (
        <>
          <RatingsCard doc={snapshot.teams} highlight={abbr} onSelect={(other) => other !== abbr && links.team(other)} />
          <LuckCard doc={snapshot.teams} highlight={abbr} onSelect={(other) => other !== abbr && links.team(other)} />
          <Section
            title="Where do they win and lose?"
            note="Dean Oliver’s four factors, on each end: shooting matters most (about 40%), then turnovers (25%), offensive boards (20%) and free throws (15%). Bars run right when better than the league average.">
            <FourFactors sides={factorRows(teamByAbbr.get(abbr)!, snapshot.teams.teams, snapshot.teams.league)} teams={snapshot.teams.teams.length} />
          </Section>
        </>
      )}

      {team.length === 0 ? (
        <AppText color="textSecondary">No players on this team in today’s data.</AppText>
      ) : (
        <>
          <Section title="Team leaders" note="Qualified players">
            <View style={styles.leaderGrid}>
              {TEAM_LEADER_STATS.map((stat) => {
                const p = teamLeader(team, stat);
                if (!p) return null;
                return (
                  <Pressable
                    key={stat}
                    accessibilityRole="button"
                    accessibilityLabel={`${CATALOG[stat].label}: ${p.name}, ${formatStat(stat, p.s[stat])}`}
                    onPress={() => openPlayer(p.id)}
                    style={({ pressed }) => [styles.leader, { backgroundColor: pressed ? colors.border : colors.surface }]}>
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                      {CATALOG[stat].label}
                    </AppText>
                    <AppText variant="title" style={styles.tabular}>
                      {formatStat(stat, p.s[stat])}
                    </AppText>
                    <AppText variant="small" numberOfLines={1}>
                      {p.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Roster" note="Most minutes first">
            <View style={[styles.list, { backgroundColor: colors.surface }]}>
              {team.map((p, i) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => openPlayer(p.id)}
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                    pressed && { backgroundColor: colors.border },
                  ]}>
                  <Avatar name={p.name} team={p.team} size={36} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {p.name}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {p.pos} · {p.s.gp} GP · {formatStat('mpg', p.s.mpg)} min{p.q ? '' : ' · not qualified'}
                      {p.teams.length > 1 ? ` · earlier ${p.teams.slice(1).join(', ')}` : ''}
                    </AppText>
                  </View>
                  <View style={styles.line}>
                    <Num value={formatStat('pts', p.s.pts)} label="PTS" />
                    <Num value={formatStat('reb', p.s.reb)} label="REB" />
                    <Num value={formatStat('ast', p.s.ast)} label="AST" />
                  </View>
                </Pressable>
              ))}
            </View>
          </Section>
        </>
      )}
    </ScrollView>
  );
}

function AtAGlance({ season, teams }: { season: TeamSeason; teams: number }) {
  const colors = useColors();
  const expectedW = season.pyth_w == null ? null : Math.round(season.pyth_w);
  const rank = (stat: 'net' | 'ortg' | 'drtg') => {
    const r = season.rank[stat];
    return r == null ? '' : `${ordinal(r)} of ${teams}`;
  };
  return (
    <View style={styles.glance}>
      <View style={[styles.grid, { backgroundColor: colors.surface }]}>
        <Tile
          label="Record"
          value={season.w != null && season.l != null ? `${season.w}–${season.l}` : '–'}
          note={expectedW != null ? `Point differential says ${expectedW}–${season.gp - expectedW}` : ''}
        />
        <Tile label="Net rating" value={season.net == null ? '–' : signed(season.net)} note={rank('net')} />
        <Tile label="Offense" value={season.ortg == null ? '–' : season.ortg.toFixed(1)} note={rank('ortg')} />
        <Tile label="Defense" value={season.drtg == null ? '–' : season.drtg.toFixed(1)} note={rank('drtg')} />
      </View>
      <AppText variant="caption" color="textSecondary">
        Offense and defense are points scored and allowed per 100 possessions, so fast and slow teams compare
        fairly. Net rating is the gap.
        {season.pace != null
          ? ` They play at ${season.pace.toFixed(1)} possessions a game (${ordinal(season.rank.pace ?? 0)} fastest).`
          : ''}
      </AppText>
    </View>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}. ${note}`}>
      <AppText variant="caption" color="textSecondary" style={styles.tileLabel}>
        {label.toUpperCase()}
      </AppText>
      <AppText variant="title" style={styles.tabular}>
        {value}
      </AppText>
      <AppText variant="caption" color="textSecondary" numberOfLines={2}>
        {note}
      </AppText>
    </View>
  );
}

function Num({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.num}>
      <AppText variant="number">{value}</AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  hero: { flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden' },
  stripe: { width: 6 },
  heroText: { flex: 1, padding: spacing.lg, gap: spacing.xs },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  glance: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: radius.lg, paddingVertical: spacing.sm },
  tile: { width: '50%', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 2 },
  tileLabel: { fontWeight: '700', letterSpacing: 0.8 },
  leaderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  leader: { width: '48.5%', borderRadius: radius.lg, padding: spacing.md, gap: 2, flexGrow: 1 },
  list: { borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
  line: { flexDirection: 'row', gap: spacing.md },
  num: { alignItems: 'flex-end', minWidth: 36 },
});
