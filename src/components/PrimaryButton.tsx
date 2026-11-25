import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, layout, radius } from '../theme';

/** The one primary CTA: full width, 48pt tall, 17pt label. */
export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [styles.button, off && styles.off, pressed && styles.pressed, style]}>
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={styles.label}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    minHeight: layout.control,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colors.onPrimary, fontSize: 17, fontWeight: '600' },
  off: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
