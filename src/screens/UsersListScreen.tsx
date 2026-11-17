import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { listUsers, type AdminUser } from '../api';
import { colors, radius, spacing, type } from '../theme';

/** J5 — who has access: plain list of users; tap for details. */
export function UsersListScreen() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let alive = true;
    listUsers()
      .then(l => alive && (setUsers(l), setError('')))
      .catch(e => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Users</Text>
        <TouchableOpacity onPress={() => router.push('/users/new')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.add}>＋ New</Text>
        </TouchableOpacity>
      </View>
      {error !== '' ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : users === null ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={users}
          keyExtractor={u => u.username}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.rowCard}
              onPress={() => router.push(`/users/${item.username}`)}>
              <Text style={styles.name} numberOfLines={1}>{item.username}</Text>
              <View style={styles.right}>
                <Text
                  style={[styles.badge, item.role === 'admin' ? styles.badgeAdmin : styles.badgeUser]}>
                  {item.role === 'admin' ? 'Admin' : 'User'}
                </Text>
                {item.suspended && <Text style={[styles.badge, styles.badgeSuspended]}>Suspended</Text>}
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.name, styles.empty]}>No users yet</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600', width: 72 },
  screenTitle: { flex: 1, textAlign: 'center', ...type.headline },
  add: { color: colors.primary, fontSize: 17, fontWeight: '600', width: 72, textAlign: 'right' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  rowCard: {
    backgroundColor: colors.card,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  name: { ...type.headline, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 99,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  badgeAdmin: { color: colors.primary, backgroundColor: colors.primarySoft },
  badgeUser: { color: colors.muted, backgroundColor: colors.bg },
  badgeSuspended: { color: colors.onWarning, backgroundColor: colors.warning },
  chevron: { color: colors.faint, fontSize: 22, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: spacing.xxl, color: colors.muted },
  error: { color: colors.danger, textAlign: 'center' },
});
