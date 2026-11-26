import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout, spacing } from '../theme';

/** One row inside a ListSection. Children own the inner layout. */
export function ListRow({
  children,
  onPress,
  onLongPress,
  divider = false,
  disabled = false,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Draw a top hairline; pass `true` for every row after the first. */
  divider?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const interactive = !!(onPress || onLongPress);
  return (
    <Pressable
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={interactive ? { disabled } : undefined}
      disabled={!interactive || disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        pressed && styles.pressed,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.row,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  pressed: { backgroundColor: colors.fill },
});
