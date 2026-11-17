import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as api from '../api';
import { syncAndUpload } from '../sync';
import { retryFailed } from '../upload';
import { registerSyncTask } from '../background';
import * as db from '../db';
import type { AssetRow } from '../db';
import { colors, radius, spacing, type } from '../theme';

/** Home: sync status card, primary Sync action, chevron rows, destructive text actions. */
export function HomeScreen() {
  const [server] = useState(() => api.getServerUrl());
  const [counts, setCounts] = useState({ total: 0, uploaded: 0, pending: 0, failed: 0 });
  const [failedRows, setFailedRows] = useState<AssetRow[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = useCallback(async () => {
    setCounts(await db.getStateCounts());
    setFailedRows(await db.listFailed(10));
    const ts = await db.getMeta('last_sync');
    setLastSync(ts ? new Date(Number(ts)).toLocaleString() : null);
  }, []);

  const runSync = useCallback(
    async (mode: 'sync' | 'retry') => {
      setBusy(true);
      setStatus('Scanning library and uploading…');
      try {
        const r = mode === 'retry' ? await retryFailed() : await syncAndUpload();
        setStatus(`Library: ${r.total} · uploaded ${r.uploaded} · failed ${r.failed}`);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [refresh],
  );

  useEffect(() => {
    registerSyncTask();
    api.me().then(m => setIsAdmin(m.admin)).catch(() => setIsAdmin(false));
    // On-open backfill: catches anything missed while the app was closed.
    // Deferred one microtask so the effect body itself performs no synchronous setState.
    void Promise.resolve().then(() => {
      refresh();
      runSync('sync');
    });
  }, [refresh, runSync]);

  const stats = [
    { label: 'Indexed', value: counts.total },
    { label: 'Uploaded', value: counts.uploaded },
    { label: 'Pending', value: counts.pending },
    { label: 'Failed', value: counts.failed },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={type.title}>FileBackup</Text>
          <Text style={type.sub}>Server: {server}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statRow}>
            {stats.map(s => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          {lastSync && <Text style={type.sub}>Last sync: {lastSync}</Text>}
          {status !== '' && <Text style={type.sub}>{status}</Text>}
          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.disabled]}
            disabled={busy}
            onPress={() => runSync('sync')}>
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>{busy ? 'Working…' : 'Sync now'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {counts.failed > 0 && (
          <View style={[styles.card, styles.failedCard]}>
            <TouchableOpacity
              disabled={busy}
              onPress={() => runSync('retry')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.retryText}>Retry {counts.failed} failed upload{counts.failed === 1 ? '' : 's'} ›</Text>
            </TouchableOpacity>
            {failedRows.map(r => (
              <Text key={r.filename} style={styles.failedRow} numberOfLines={2}>
                {r.filename}{r.error ? ` — ${r.error}` : ''}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/files')}
            hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={styles.actionText}>View backed-up files</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={[styles.actionRow, styles.divider]}
              onPress={() => router.push('/admin')}
              hitSlop={{ top: 8, bottom: 8 }}>
              <Text style={styles.actionText}>User management</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => api.logout().then(() => router.replace('/login'))}>
            <Text style={styles.quietAction}>Log out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={busy}
            onPress={() =>
              Alert.alert(
                'Reset local index?',
                'Clears the upload history on this phone. Nothing on the server is touched — the next sync will re-upload everything.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () =>
                      db
                        .resetIndex()
                        .then(refresh)
                        .then(() => setStatus('Local index cleared'))
                        .catch(e =>
                          setStatus(e instanceof Error ? e.message : String(e)),
                        ),
                  },
                ],
              )
            }>
            <Text style={[styles.quietAction, styles.destructive]}>Reset local index</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { ...type.title, fontSize: 20 },
  statLabel: { ...type.section, textTransform: 'uppercase', marginTop: spacing.xs },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.control,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  failedCard: {
    backgroundColor: '#FEF2F2', // red-tinted surface for the failed list
    borderColor: '#FECACA',
  },
  retryText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  failedRow: { color: colors.danger, fontSize: 13, opacity: 0.8 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  actionText: { ...type.body, fontWeight: '500' },
  chevron: { color: colors.faint, fontSize: 20, fontWeight: '600' },
  footerActions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
  quietAction: { color: colors.muted, fontSize: 15, fontWeight: '500' },
  destructive: { color: colors.danger },
});
