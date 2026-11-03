import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { SecondaryButton } from '@/components/Button';
import { DailyCard } from '@/components/DailyCard';
import { DataStatusLine, FirstLoad } from '@/components/DataStatus';
import { Section } from '@/components/Section';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import { useFollows } from '@/follow/FollowProvider';
import { useGameProgress } from '@/game/useGameProgress';
import { formatDate, formatStat } from '@/lib/format';
import { usePlayerLink } from '@/lib/usePlayerLink';
import { hourLabel, type ReminderSettings } from '@/notify/plan';
import {
  loadReminderSettings,
  refreshReminders,
  remindersSupported,
  requestPermission,
  saveReminderSettings,
} from '@/notify/reminders';
import { CATALOG } from '@/stats/catalog';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';
import { boxLine, factOfTheDay, formChanges, leaders, LEADER_STATS, topGames, type FormChange } from '@/today/feed';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

function dayBefore(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

export default function TodayScreen() {
  const { snapshot, loading, refresh, playerById } = useData();
  const colors = useColors();
  const openPlayer = usePlayerLink();
  const { ids } = useFollows();
  const { today, puzzle, progress } = useGameProgress();

  // Keep scheduled reminders current each launch (streak text, skip if played).
  useEffect(() => {
    refreshReminders();
  }, []);

  const players = snapshot?.players.players;
  const feed = useMemo(() => {
    if (!players) return null;
    return {
      games: topGames(players, 8),
      form: formChanges(players, 5),
      fact: factOfTheDay(players, today),
    };
  }, [players, today]);

  if (!snapshot || !feed) return <FirstLoad />;

  const { latest, recent } = snapshot.players;
  const followed = ids.map((id) => playerById.get(id)).filter((p): p is Player => p != null);
  const latestTitle =
    latest && latest.since === dayBefore(snapshot.manifest.asOf) ? 'Last night’s best' : 'Latest games';
  const recentNote = recent
    ? `Points per game over the ${recent.days === 7 ? 'last week' : `last ${recent.days} days`} against the season average`
    : undefined;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />}>
      <View style={styles.dateBlock}>
        <AppText variant="bodyStrong">
          {weekday(today)}, {formatDate(today)}
        </AppText>
        <DataStatusLine />
      </View>

      <DailyCard puzzle={puzzle} today={today} progress={progress} />

      {feed.fact && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <AppText variant="caption" color="textSecondary" style={styles.kicker}>
            STAT OF THE DAY
          </AppText>
          <AppText variant="body">{feed.fact.text}</AppText>
          <View style={styles.chipRow}>
            {feed.fact.playerIds.slice(0, 4).map((id) => {
              const p = playerById.get(id);
              return p ? <NameChip key={id} name={p.name} onPress={() => openPlayer(id)} /> : null;
            })}
          </View>
        </View>
      )}

      {latest && feed.games.length > 0 && (
        <Section title={latestTitle} note={latestTitle === 'Latest games' ? `Since ${formatDate(latest.since)}, by Game Score` : 'By Game Score'}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.hList}>
            {feed.games.map((p, i) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${boxLine(p.g)}`}
                onPress={() => openPlayer(p.id)}
                style={({ pressed }) => [styles.gameTile, { backgroundColor: pressed ? colors.border : colors.surface }]}>
                <View style={styles.tileTop}>
                  <AppText variant="caption" color="textSecondary" style={styles.kicker}>
                    #{i + 1}
                  </AppText>
                  <TeamChip abbr={p.team} />
                </View>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {p.name}
                </AppText>
                <AppText variant="small">{boxLine(p.g)}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {p.g.fgm ?? 0}-{p.g.fga ?? 0} FG · {p.g.mpg ?? 0} min · GmSc {formatStat('game_score', p.g.game_score)}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </Section>
      )}

      {recent && feed.form.hot.length > 0 && (
        <Section title="Heating up" note={recentNote}>
          <FormList rows={feed.form.hot} onOpen={openPlayer} />
        </Section>
      )}
      {recent && feed.form.cold.length > 0 && (
        <Section title="Cooling off">
          <FormList rows={feed.form.cold} onOpen={openPlayer} />
        </Section>
      )}

      <Section title="Following">
        {followed.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <AppText color="textSecondary">
              Tap Follow on any player’s page to keep them here, with their latest game and recent form.
            </AppText>
            <SecondaryButton label="Browse players" onPress={() => router.navigate('/players')} />
          </View>
        ) : (
          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {followed.map((p, i) => (
              <FollowRow key={p.id} player={p} first={i === 0} recentDays={recent?.days} onPress={() => openPlayer(p.id)} />
            ))}
          </View>
        )}
      </Section>

      <Section title="League leaders" note="Qualified players">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.hList}>
          {LEADER_STATS.map((stat) => (
            <View key={stat} style={[styles.leaderCard, { backgroundColor: colors.surface }]}>
              <AppText variant="caption" color="textSecondary" style={styles.kicker} numberOfLines={1}>
                {CATALOG[stat].label.toUpperCase()}
              </AppText>
              {leaders(snapshot.players.players, stat, 3).map((p, i) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1}. ${p.name}, ${formatStat(stat, p.s[stat])}`}
                  onPress={() => openPlayer(p.id)}
                  style={styles.leaderRow}>
                  <AppText variant="small" color="textSecondary" style={styles.rankNum}>
                    {i + 1}
                  </AppText>
                  <AppText variant="small" numberOfLines={1} style={[styles.flex, i === 0 && styles.bold]}>
                    {p.name}
                  </AppText>
                  <AppText variant="number">{formatStat(stat, p.s[stat])}</AppText>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </Section>

      {remindersSupported && <ReminderCard />}
    </ScrollView>
  );
}

function NameChip({ name, onPress }: { name: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.nameChip, { borderColor: colors.border, backgroundColor: pressed ? colors.border : 'transparent' }]}>
      <AppText variant="small" color="accent" style={styles.bold}>
        {name} ›
      </AppText>
    </Pressable>
  );
}

function FormList({ rows, onOpen }: { rows: FormChange[]; onOpen: (id: number) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.list, { backgroundColor: colors.surface }]}>
      {rows.map((r, i) => (
        <Pressable
          key={r.player.id}
          accessibilityRole="button"
          accessibilityLabel={`${r.player.name}: ${r.recent.toFixed(1)} points per game in ${r.games} games, season ${r.season.toFixed(1)}`}
          onPress={() => onOpen(r.player.id)}
          style={({ pressed }) => [
            styles.row,
            i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
            pressed && { backgroundColor: colors.border },
          ]}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {r.player.name}
            </AppText>
            <View style={styles.meta}>
              <TeamChip abbr={r.player.team} />
              <AppText variant="caption" color="textSecondary">
                {r.games} games · season {r.season.toFixed(1)}
              </AppText>
            </View>
          </View>
          <View style={styles.right}>
            <AppText variant="number">{r.recent.toFixed(1)}</AppText>
            <AppText variant="caption" color="textSecondary">
              {r.change > 0 ? '▲' : '▼'} {Math.abs(r.change).toFixed(1)}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function FollowRow({
  player,
  first,
  recentDays,
  onPress,
}: {
  player: Player;
  first: boolean;
  recentDays: number | undefined;
  onPress: () => void;
}) {
  const colors = useColors();
  const s = player.s;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        styles.followRow,
        !first && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
        pressed && { backgroundColor: colors.border },
      ]}>
      <View style={styles.meta}>
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
          {player.name}
        </AppText>
        <TeamChip abbr={player.team} />
      </View>
      <AppText variant="small">
        Season: {formatStat('pts', s.pts)} PTS · {formatStat('reb', s.reb)} REB · {formatStat('ast', s.ast)} AST
      </AppText>
      {player.r && recentDays != null && (
        <AppText variant="small" color="textSecondary">
          Last {recentDays === 7 ? 'week' : `${recentDays} days`}: {formatStat('pts', player.r.pts)} PTS ·{' '}
          {formatStat('reb', player.r.reb)} REB · {formatStat('ast', player.r.ast)} AST ({player.r.gp} games)
        </AppText>
      )}
      {player.g && (
        <AppText variant="small" color="textSecondary">
          Latest game: {boxLine(player.g)}
        </AppText>
      )}
    </Pressable>
  );
}

const HOURS = [9, 12, 18, 21];

function ReminderCard() {
  const colors = useColors();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadReminderSettings().then((s) => {
      if (!cancelled) setSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings) return null;

  async function update(next: ReminderSettings) {
    if (next.enabled && !settings?.enabled) {
      const ok = await requestPermission();
      setDenied(!ok);
      if (!ok) return;
    }
    setSettings(next);
    await saveReminderSettings(next);
    await refreshReminders();
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.meta}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Daily puzzle reminder</AppText>
          <AppText variant="caption" color="textSecondary">
            One nudge a day, skipped once you’ve played.
          </AppText>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(enabled) => update({ ...settings, enabled })}
          trackColor={{ true: colors.accent, false: colors.border }}
          accessibilityLabel="Daily puzzle reminder"
        />
      </View>
      {denied && (
        <AppText variant="caption" color="danger">
          Notifications are off for this app. Turn them on in Settings to get reminders.
        </AppText>
      )}
      {settings.enabled && (
        <View style={styles.chipRow}>
          {HOURS.map((h) => {
            const selected = settings.hour === h;
            return (
              <Pressable
                key={h}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => update({ ...settings, hour: h })}
                style={[styles.hourChip, { backgroundColor: selected ? colors.accentFill : colors.background }]}>
                <AppText variant="small" color={selected ? 'textOnAccent' : 'text'} style={styles.bold}>
                  {hourLabel(h)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  kicker: { fontWeight: '700', letterSpacing: 0.8 },
  dateBlock: { gap: 2 },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  nameChip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  bleed: { marginHorizontal: -spacing.lg },
  hList: { gap: spacing.md, paddingHorizontal: spacing.lg },
  gameTile: { width: 220, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
  followRow: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  right: { alignItems: 'flex-end' },
  leaderCard: { width: 240, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  rankNum: { width: 14, fontVariant: ['tabular-nums'] },
  hourChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.pill },
});
