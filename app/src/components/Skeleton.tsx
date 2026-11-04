/**
 * Loading placeholders shaped like the screen that is coming, so the layout
 * never jumps. They pulse gently, and hold still when the system asks for
 * reduced motion.
 */
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { motion, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

function Pulse({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: motion.pulse, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduced, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function Block({
  width = '100%',
  height,
  round = radius.sm,
}: {
  width?: DimensionValue;
  height: number;
  round?: number;
}) {
  const colors = useColors();
  return <View style={{ width, height, borderRadius: round, backgroundColor: colors.surface }} />;
}

function Row() {
  return (
    <View style={styles.row}>
      <Block width={40} height={40} round={20} />
      <View style={styles.flex}>
        <Block width="60%" height={14} />
        <Block width="35%" height={10} />
      </View>
      <Block width={40} height={14} />
    </View>
  );
}

export type SkeletonShape = 'feed' | 'list' | 'page';

/** A full-screen placeholder: a feed of cards, a list of rows, or a player page. */
export function ScreenSkeleton({ shape = 'feed' }: { shape?: SkeletonShape }) {
  const colors = useColors();
  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background }]}
      accessible
      accessibilityLabel="Loading stats"
      accessibilityRole="progressbar">
      <Pulse>
        {shape === 'list' ? (
          <View style={styles.stack}>
            <Block height={40} round={radius.md} />
            <View style={styles.chips}>
              {[56, 48, 52, 48, 48].map((w, i) => (
                <Block key={i} width={w} height={30} round={radius.pill} />
              ))}
            </View>
            {Array.from({ length: 8 }, (_, i) => (
              <Row key={i} />
            ))}
          </View>
        ) : shape === 'page' ? (
          <View style={styles.stack}>
            <View style={styles.row}>
              <Block width={64} height={64} round={32} />
              <View style={styles.flex}>
                <Block width="70%" height={24} />
                <Block width="40%" height={14} />
              </View>
            </View>
            <Block height={72} round={radius.lg} />
            {Array.from({ length: 6 }, (_, i) => (
              <View key={i} style={styles.statRow}>
                <Block width="50%" height={14} />
                <Block height={6} round={radius.pill} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.stack}>
            <Block width="45%" height={16} />
            <Block height={112} round={radius.lg} />
            <Block height={88} round={radius.lg} />
            <Block width="35%" height={20} />
            {Array.from({ length: 4 }, (_, i) => (
              <Row key={i} />
            ))}
          </View>
        )}
      </Pulse>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, paddingTop: spacing.xxl * 3 },
  stack: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.sm },
  statRow: { gap: spacing.sm },
});
