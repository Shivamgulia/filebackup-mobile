import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

/** Inset-grouped list surface: one white panel; rows divide with hairlines. */
export function ListSection({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.section, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});

/** Same surface for a FlatList `contentContainerStyle` (the card wraps the rows). */
export const listSectionStyle = styles.section;
