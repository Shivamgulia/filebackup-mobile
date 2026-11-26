import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, radius, spacing, type } from '../theme';

const tints = {
  primary: colors.primary,
  destructive: colors.danger,
  quiet: colors.muted,
} as const;

/** Inline text action (header actions, row actions). Always a 44pt target. */
export function TextButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: keyof typeof tints;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {icon !== undefined && <Icon name={icon} size={18} color={tints[variant]} />}
      <Text style={[styles.label, { color: tints[variant] }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.control,
  },
  label: { ...type.headline },
  pressed: { opacity: 0.5 },
  disabled: { opacity: 0.4 },
});
