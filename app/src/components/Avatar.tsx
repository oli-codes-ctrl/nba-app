import { StyleSheet, Text, View } from 'react-native';

import { teamInfo } from '@/theme/teams';
import { useColors } from '@/theme/useTokens';

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

/** "Luka Dončić" -> "LD", "Walter Clayton Jr." -> "WC", "P.J. Washington" -> "PW". */
export function initials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}]/gu, ''))
    .filter((w) => w && !SUFFIXES.has(w.toLowerCase()));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * A player's initials in a circle. No photos or silhouettes, by design. The
 * ring is his team color: an identity accent, never a data encoding.
 */
export function Avatar({ name, team, size = 40 }: { name: string; team: string; size?: number }) {
  const colors = useColors();
  const ring = Math.max(2, Math.round(size / 20));
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ring,
          borderColor: teamInfo(team).color,
          backgroundColor: colors.surfaceRaised,
        },
      ]}>
      <Text style={[styles.text, { color: colors.text, fontSize: Math.round(size * 0.36) }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700', letterSpacing: 0.5 },
});
