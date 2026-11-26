import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { listFilesAt, type FileSummary } from '../api';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ListRow } from '../components/ListRow';
import { listSectionStyle } from '../components/ListSection';
import { LoadingState } from '../components/LoadingState';
import { colors, spacing, type } from '../theme';

const mb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : bytes >= 1024 ? `${(bytes / 1024).toFixed(0)} KB`
  : `${bytes} B`;

/** Read-only listing of a folder another user shared (path is the folder, not a file). */
export function SharedFolderScreen() {
  const insets = useSafeAreaInsets();
  const { path, owner } = useLocalSearchParams<{ path: string; owner?: string }>();
  const folder = typeof path === 'string' ? path : '';
  const [files, setFiles] = useState<FileSummary[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (folder === '') return;
    try {
      setFiles(await listFilesAt(`${folder}/`));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [folder]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const title = folder.split('/').pop() ?? 'Shared folder';

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <Stack.Screen options={{ title }} />
      {owner !== undefined && <Text style={styles.sub}>Shared by {owner}</Text>}

      {error !== '' ? (
        <ErrorState message={error} onRetry={load} />
      ) : files === null ? (
        <LoadingState />
      ) : (
        <View style={[styles.listWrap, { paddingBottom: insets.bottom }]}>
          <FlatList
            contentContainerStyle={listSectionStyle}
            data={files}
            keyExtractor={f => f.path}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <EmptyState text="The owner has no files here any more" style={styles.empty} />
            }
            renderItem={({ item, index }) => (
              <ListRow
                divider={index > 0}
                onPress={() =>
                  router.push({
                    pathname: '/viewer',
                    params: {
                      path: item.path,
                      sizeBytes: String(item.sizeBytes),
                      versionCount: String(item.versionCount),
                      lastModified: item.lastModified,
                      readOnly: '1',
                    },
                  })
                }
                style={styles.row}>
                <Text style={styles.path} numberOfLines={1}>
                  {item.path.split('/').pop()}
                </Text>
                <Text style={styles.meta}>
                  {mb(item.sizeBytes)} · {new Date(item.lastModified).toLocaleString()}
                </Text>
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
  sub: { textAlign: 'center', ...type.meta, paddingTop: spacing.sm },
  listWrap: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  row: { gap: spacing.xs },
  path: { ...type.bodySm, fontWeight: '500' },
  meta: type.meta,
  empty: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
