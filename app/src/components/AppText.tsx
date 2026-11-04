import { StyleSheet, Text, type TextProps } from 'react-native';

import { font, type ColorToken } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

/**
 * The type scale. Hierarchy comes from size and weight, never from color
 * alone; every number uses tabular figures so columns line up.
 * - display: one big number per screen (a score, a record)
 * - large / title: page and section titles
 * - body / bodyStrong / small: reading text
 * - number: stat values in rows and tables
 * - caption: notes, ranks, sample sizes
 * - kicker: small all-caps labels above a value or card
 */
type Variant = 'display' | 'large' | 'title' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'kicker' | 'number';

export type AppTextProps = TextProps & {
  variant?: Variant;
  color?: ColorToken;
};

export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  const colors = useColors();
  return <Text style={[styles[variant], { color: colors[color] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: { fontSize: font.size.display, lineHeight: 46, fontWeight: '800', fontVariant: ['tabular-nums'] },
  large: { fontSize: font.size.large, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: font.size.title, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: font.size.body, lineHeight: 22 },
  bodyStrong: { fontSize: font.size.body, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: font.size.small, lineHeight: 20 },
  caption: { fontSize: font.size.caption, lineHeight: 16 },
  kicker: {
    fontSize: font.size.caption,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  number: { fontSize: font.size.body, lineHeight: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
