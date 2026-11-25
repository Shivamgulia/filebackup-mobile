import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { retryFailed } from '../upload';
import * as db from '../db';
import type { AssetRow } from '../db';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing, type } from '../theme';

const MAX_ROWS = 100; // db.listFailed() display cap

/** J3 — failure details: every failed upload, why, and one Try again action. */
export function FailedScreen() {
  const insets = useSafeAreaInsets();
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
      <ScreenHeader title="Uploads that failed" />
      <PrimaryButton
        title="Try again"
        loading={busy}
        disabled={rows?.length === 0}
        onPress={tryAgain}
        style={styles.tryButton}
      />
      {rows === null ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState text="No failures — everything is backed up ✓" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xl + insets.bottom }]}
          data={rows}
          keyExtractor={r => String(r.id)}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>{item.filename}</Text>
              <Text style={styles.error}>{item.error ?? 'Upload failed'}</Text>
              <Text style={styles.when}>
                Last attempt {new Date(item.updated_at).toLocaleString()}
              </Text>
            </Card>
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
  tryButton: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  row: { paddingVertical: spacing.md, gap: spacing.xs },
  name: { ...type.headline },
  error: { ...type.meta, color: colors.danger },
  when: { ...type.meta, color: colors.faint },
});
