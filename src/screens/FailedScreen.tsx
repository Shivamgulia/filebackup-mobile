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
import { retryFailed } from '../upload';
import * as db from '../db';
import type { AssetRow } from '../db';
import { colors, radius, spacing, type } from '../theme';

const MAX_ROWS = 100; // db.listFailed() display cap

/** J3 — failure details: every failed upload, why, and one Try again action. */
export function FailedScreen() {
  const [rows, setRows] = useState<AssetRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    db.listFailed(MAX_ROWS).then(setRows).catch(() => setRows([]));
  }, []);

  useFocusEffect(useCallback(() => {
    let alive = true;
    db.listFailed(MAX_ROWS).then(l => alive && setRows(l)).catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, []));

  async function tryAgain() {
    setBusy(true);
    try {
      await retryFailed();
    } catch {
      // errors are already persisted per row; the list tells the story
    } finally {
      setBusy(false);
      reload();
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Uploads that failed</Text>
        <View style={{ width: 64 }} />
      </View>
      <TouchableOpacity
        style={[styles.tryButton, (busy || rows?.length === 0) && styles.disabled]}
        disabled={busy || rows?.length === 0}
        onPress={tryAgain}>
        {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.tryText}>Try again</Text>}
      </TouchableOpacity>
      {rows === null ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.centered}>
          <Text style={type.sub}>No failures — everything is backed up ✓</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={rows}
          keyExtractor={r => String(r.id)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>{item.filename}</Text>
              <Text style={styles.error}>{item.error ?? 'Upload failed'}</Text>
              <Text style={styles.when}>
                Last attempt {new Date(item.updated_at).toLocaleString()}
              </Text>
            </View>
          )}
          ListFooterComponent={
            rows.length === MAX_ROWS ? (
              <Text style={styles.when}>Only the latest {MAX_ROWS} are shown</Text>
            ) : undefined
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
  back: { color: colors.primary, fontSize: 17, fontWeight: '600', width: 64 },
  screenTitle: { flex: 1, textAlign: 'center', ...type.headline },
  tryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.control,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tryText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 2,
  },
  name: { ...type.headline },
  error: { fontSize: 13, color: colors.danger },
  when: { fontSize: 12, color: colors.faint, marginTop: 2 },
});
