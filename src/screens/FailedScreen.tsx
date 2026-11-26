import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { retryFailed } from '../upload';
import * as db from '../db';
import type { AssetRow } from '../db';
import { EmptyState } from '../components/EmptyState';
import { ListRow } from '../components/ListRow';
import { listSectionStyle } from '../components/ListSection';
import { LoadingState } from '../components/LoadingState';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, spacing, type } from '../theme';

const MAX_ROWS = 100; // db.listFailed() display cap

/** J3 — failure details: every failed upload, why, and one Try again action. */
export function FailedScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<AssetRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await db.listFailed(MAX_ROWS));
    } catch {
      setRows([]);
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

  async function tryAgain() {
    setBusy(true);
    try {
      await retryFailed();
    } catch {
      // errors are already persisted per row; the list tells the story
    } finally {
      setBusy(false);
      await load();
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <PrimaryButton
        title="Try again"
        loading={busy}
        disabled={rows?.length === 0}
        onPress={tryAgain}
        style={styles.tryButton}
      />
      {rows === null ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState text="No failures — everything is backed up ✓" style={styles.empty} />
        </View>
      ) : (
        <View style={[styles.listWrap, { paddingBottom: insets.bottom }]}>
          <FlatList
            contentContainerStyle={listSectionStyle}
            data={rows}
            keyExtractor={r => String(r.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item, index }) => (
              <ListRow divider={index > 0} style={styles.row}>
                <Text style={styles.name} numberOfLines={1}>{item.filename}</Text>
                <Text style={styles.error}>{item.error ?? 'Upload failed'}</Text>
                <Text style={styles.when}>
                  Last attempt {new Date(item.updated_at).toLocaleString()}
                </Text>
              </ListRow>
            )}
            ListFooterComponent={
              rows.length === MAX_ROWS ? (
                <Text style={styles.footer}>Only the latest {MAX_ROWS} are shown</Text>
              ) : undefined
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tryButton: { marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { marginTop: 0, paddingHorizontal: spacing.lg },
  listWrap: { flex: 1, paddingHorizontal: spacing.lg },
  row: { gap: spacing.xs },
  name: { ...type.headline },
  error: { ...type.meta, color: colors.danger },
  when: { ...type.meta, color: colors.faint },
  footer: { ...type.meta, color: colors.faint, padding: spacing.lg, textAlign: 'center' },
});
