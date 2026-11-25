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
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { listFilesAt, type FileSummary } from '../api';
import { colors, spacing, type } from '../theme';

const mb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : bytes >= 1024 ? `${(bytes / 1024).toFixed(0)} KB`
  : `${bytes} B`;

/** Read-only listing of a folder another user shared (path is the folder, not a file). */
export function SharedFolderScreen() {
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {folder.split('/').pop() ?? 'Shared folder'}
        </Text>
        <View style={styles.back} />
      </View>

      {owner !== undefined && <Text style={styles.sub}>Shared by {owner}</Text>}

      {error !== '' ? (
        <Text style={styles.error}>{error}</Text>
      ) : files === null ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={files}
          keyExtractor={f => f.path}
          ListEmptyComponent={
            <Text style={styles.empty}>The owner has no files here any more</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
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
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600', width: 64 },
  title: { flex: 1, textAlign: 'center', ...type.headline },
  sub: { textAlign: 'center', ...type.sub, paddingBottom: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: 2,
  },
  path: { fontSize: 14, color: colors.fg, fontWeight: '500' },
  meta: { fontSize: 12, color: colors.muted },
  empty: { ...type.sub, textAlign: 'center', marginTop: spacing.xl },
  error: { color: colors.danger, textAlign: 'center', padding: spacing.lg },
});
