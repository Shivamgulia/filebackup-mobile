import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, type } from '../theme';

/**
 * Fixed nav row: back · centered title · right slot. Render it above the scroll
 * view. The side columns are equal flex, so the title stays centered whatever
 * the right action's width.
 */
export function ScreenHeader({ title, right }: { title?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.side}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  side: { flex: 1 },
  right: { alignItems: 'flex-end' },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600' },
  title: { ...type.headline, textAlign: 'center' },
});
