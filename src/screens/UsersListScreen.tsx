import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { listUsers, type AdminUser } from '../api';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing, type } from '../theme';

/** J5 — who has access: plain list of users; tap for details. */
export function UsersListScreen() {
  const insets = useSafeAreaInsets();
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
      <ScreenHeader
        title="Users"
        right={
          <TouchableOpacity onPress={() => router.push('/users/new')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.add}>＋ New</Text>
          </TouchableOpacity>
        }
      />
      {error !== '' ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : users === null ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xl + insets.bottom }]}
          data={users}
          keyExtractor={u => u.username}
          renderItem={({ item }) => (
            <Card
              style={styles.rowCard}
              onPress={() => router.push(`/users/${item.username}`)}>
              <Text style={styles.name} numberOfLines={1}>{item.username}</Text>
              <View style={styles.right}>
                <Badge label={item.role === 'admin' ? 'Admin' : 'User'} variant={item.role === 'admin' ? 'admin' : 'user'} />
                {item.suspended && <Badge label="Suspended" variant="suspended" />}
                <Text style={styles.chevron}>›</Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={<EmptyState text="No users yet" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  add: { color: colors.primary, fontSize: 17, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  name: { ...type.headline, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chevron: { color: colors.faint, fontSize: 22, fontWeight: '600' },
  error: { color: colors.danger, textAlign: 'center' },
});
