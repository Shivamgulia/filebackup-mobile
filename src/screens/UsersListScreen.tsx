import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import { listUsers, type AdminUser } from '../api';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Icon } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { listSectionStyle } from '../components/ListSection';
import { LoadingState } from '../components/LoadingState';
import { TextButton } from '../components/TextButton';
import { colors, spacing, type } from '../theme';

/** J5 — who has access: inset-grouped list of users; tap for details. */
export function UsersListScreen() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await listUsers());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TextButton title="New" icon="add" onPress={() => router.push('/users/new')} />
          ),
        }}
      />
      {error !== '' ? (
        <ErrorState message={error} onRetry={load} />
      ) : users === null ? (
        <LoadingState />
      ) : (
        <View style={[styles.listWrap, { paddingBottom: insets.bottom }]}>
          <FlatList
            contentContainerStyle={listSectionStyle}
            data={users}
            keyExtractor={u => u.username}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<EmptyState text="No users yet" style={styles.empty} />}
            renderItem={({ item, index }) => (
              <ListRow
                divider={index > 0}
                onPress={() => router.push(`/users/${item.username}`)}
                style={styles.row}>
                <Text style={styles.name} numberOfLines={1}>{item.username}</Text>
                <View style={styles.right}>
                  <Badge
                    label={item.role === 'admin' ? 'Admin' : 'User'}
                    variant={item.role === 'admin' ? 'admin' : 'user'}
                  />
                  {item.suspended && <Badge label="Suspended" variant="suspended" />}
                  <Icon name="chevron-forward" size={18} color={colors.faint} />
                </View>
              </ListRow>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  listWrap: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  name: { ...type.headline, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  empty: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
