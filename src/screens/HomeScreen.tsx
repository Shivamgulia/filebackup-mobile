import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as api from '../api';
import { syncAndUpload } from '../sync';
import { registerSyncTask } from '../background';
import * as db from '../db';
import { colors, radius, spacing, type } from '../theme';

type SyncStatus = { text: string; color: string; tappable: boolean };

/** Home: one sync-status line answers "is my stuff backed up?", Sync action, Photos & Videos. */
export function HomeScreen() {
  const [username, setUsername] = useState('');
  const [counts, setCounts] = useState({ total: 0, uploaded: 0, pending: 0, failed: 0 });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={type.title}>FileBackup</Text>
          {username !== '' && (
            <TouchableOpacity
              accessibilityLabel="Profile"
              style={styles.avatar}
              onPress={() => router.push('/profile')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.avatarText}>{username[0].toUpperCase()}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Pressable
            onPress={status.tappable ? () => router.push('/failed') : undefined}
            disabled={!status.tappable}>
            <Text style={[styles.status, { color: status.color }]}>{status.text}</Text>
          </Pressable>
          {lastSync && <Text style={type.sub}>Last synced {lastSync}</Text>}
          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.disabled]}
            disabled={busy}
            onPress={() => runSync()}>
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Sync now</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/files')}
            hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={styles.rowLabel}>Photos & Videos</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 20, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  status: { fontSize: 17, fontWeight: '600' },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.control,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: { color: colors.onPrimary, fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rowLabel: { ...type.headline },
  chevron: { color: colors.faint, fontSize: 22, fontWeight: '600' },
});
