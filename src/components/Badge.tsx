import { StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

const variants = {
  admin: { color: colors.primary, backgroundColor: colors.primarySoft },
  user: { color: colors.muted, backgroundColor: colors.bg },
  suspended: { color: colors.onWarning, backgroundColor: colors.warning },
} as const;

export function Badge({ label, variant }: { label: string; variant: keyof typeof variants }) {
  return <Text style={[styles.badge, variants[variant]]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    ...type.caption,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
});
