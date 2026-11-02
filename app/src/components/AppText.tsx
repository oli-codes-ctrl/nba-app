import { StyleSheet, Text, type TextProps } from 'react-native';

import { font, type ColorToken } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

type Variant = 'large' | 'title' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'number';

export type AppTextProps = TextProps & {
  variant?: Variant;
  color?: ColorToken;
};

export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  const colors = useColors();
  return <Text style={[styles[variant], { color: colors[color] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  large: { fontSize: font.size.large, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: font.size.title, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: font.size.body, lineHeight: 22 },
  bodyStrong: { fontSize: font.size.body, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: font.size.small, lineHeight: 20 },
  caption: { fontSize: font.size.caption, lineHeight: 16 },
  number: { fontSize: font.size.body, lineHeight: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
