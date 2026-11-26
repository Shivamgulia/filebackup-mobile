import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import * as api from '../api';
import { syncAndUpload } from '../sync';
import { registerSyncTask } from '../background';
import * as db from '../db';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius, spacing, type } from '../theme';

type SyncStatus = { text: string; color: string; tappable: boolean };

/** Home: one sync-status line answers "is my stuff backed up?", Sync action, Photos & Videos. */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [counts, setCounts] = useState({ total: 0, uploaded: 0, pending: 0, failed: 0 });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setCounts(await db.getStateCounts());
    const ts = await db.getMeta('last_sync');
    setLastSync(ts ? new Date(Number(ts)).toLocaleString() : null);
  }, []);

  const runSync = useCallback(
    async () => {
      setBusy(true);
      try {
        await syncAndUpload();
      } catch (e) {
        console.warn('sync failed:', e);
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [refresh],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  useEffect(() => {
    registerSyncTask();
    api.me().then(m => setUsername(m.username)).catch(() => {});
    // On-open backfill: catches anything missed while the app was closed.
    // Deferred one microtask so the effect body itself performs no synchronous setState.
    void Promise.resolve().then(() => {
      refresh();
      runSync();
    });
  }, [refresh, runSync]);

  // Status must be correct on every return (J3): retries done on the failed
  // screen only land in the local index — refetch counts whenever home regains focus.
  useFocusEffect(useCallback(() => {
    void Promise.resolve().then(() => refresh());
  }, [refresh]));

  const left = counts.pending + counts.failed;
  const status: SyncStatus = busy
    ? { text: `Syncing… ${left} left`, color: colors.secondary, tappable: false }
    : counts.failed > 0
      ? { text: `${counts.failed} uploads failed`, color: colors.danger, tappable: true }
      : left > 0
        ? { text: `Syncing… ${left} left`, color: colors.secondary, tappable: false }
        : { text: 'All synced ✓', color: colors.primary, tappable: false };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          headerRight: () =>
            username !== '' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profile"
                style={styles.avatar}
                onPress={() => router.push('/profile')}
                hitSlop={8}>
                <Text style={styles.avatarText}>{username[0].toUpperCase()}</Text>
              </Pressable>
            ) : undefined,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}>
        <Card>
          <View style={styles.statusGroup}>
            <Pressable
              accessibilityRole={status.tappable ? 'button' : undefined}
              onPress={status.tappable ? () => router.push('/failed') : undefined}
              disabled={!status.tappable}>
              <Text style={[styles.status, { color: status.color }]}>{status.text}</Text>
            </Pressable>
            {lastSync && <Text style={type.sub}>Last synced {lastSync}</Text>}
          </View>
          <PrimaryButton
            title="Sync now"
            loading={busy}
            onPress={() => runSync()}
            style={styles.syncButton}
          />
        </Card>

        <ListSection>
          <ListRow onPress={() => router.push('/files')} style={styles.row}>
            <Text style={styles.rowLabel}>Photos & Videos</Text>
            <Icon name="chevron-forward" size={18} color={colors.faint} />
          </ListRow>
          <ListRow
            divider
            onPress={() => router.push({ pathname: '/files', params: { search: '1' } })}
            style={styles.row}>
            <Text style={styles.rowLabel}>Search</Text>
            <Icon name="chevron-forward" size={18} color={colors.faint} />
          </ListRow>
        </ListSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...type.headline, color: colors.primary },
  statusGroup: { gap: spacing.xs },
  status: { ...type.headline },
  syncButton: { marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: { ...type.headline },
});
