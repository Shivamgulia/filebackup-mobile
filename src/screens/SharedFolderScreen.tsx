import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { listFilesAt, type FileSummary } from '../api';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
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

  useFocusEffect(
    useCallback(() => {
      if (folder === '') return;
      let alive = true;
      listFilesAt(`${folder}/`)
        .then(l => alive && (setFiles(l), setError('')))
        .catch(e => alive && setError(e instanceof Error ? e.message : String(e)));
      return () => {
        alive = false;
      };
    }, [folder]),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title={folder.split('/').pop() ?? 'Shared folder'} />

      {owner !== undefined && <Text style={styles.sub}>Shared by {owner}</Text>}

      {error !== '' ? (
        <Text style={styles.error}>{error}</Text>
      ) : files === null ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xl + insets.bottom }]}
          data={files}
          keyExtractor={f => f.path}
          ListEmptyComponent={<EmptyState text="The owner has no files here any more" />}
          renderItem={({ item }) => (
            <Card
              style={styles.row}
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
              }>
              <Text style={styles.path} numberOfLines={1}>
                {item.path.split('/').pop()}
              </Text>
              <Text style={styles.meta}>
                {mb(item.sizeBytes)} · {new Date(item.lastModified).toLocaleString()}
              </Text>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center' },
  sub: { textAlign: 'center', ...type.meta, paddingBottom: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  row: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.xs },
  path: { ...type.body, fontSize: 15, fontWeight: '500' },
  meta: type.meta,
  error: { ...type.sub, color: colors.danger, textAlign: 'center', padding: spacing.lg },
});
