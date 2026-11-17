import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { listFiles, type FileSummary } from '../api';
import { colors, spacing, type } from '../theme';

const PAGE_SIZE = 20;

const mb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : bytes >= 1024 ? `${(bytes / 1024).toFixed(0)} KB`
  : `${bytes} B`;

/** Browse view of everything backed up from this phone's photos, paginated. */
export function FileListScreen() {
  const [all, setAll] = useState<FileSummary[] | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [error, setError] = useState('');

  // Refetch on every focus — covers deletes made in the viewer and app re-opens.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      listFiles()
        .then(l => alive && (setAll(l), setError('')))
        .catch(e => alive && setError(e instanceof Error ? e.message : String(e)));
      return () => {
        alive = false;
      };
    }, []),
  );

  const loadMore = useCallback(() => {
    setVisible(v => (all && v < all.length ? Math.min(v + PAGE_SIZE, all.length) : v));
  }, [all]);

  if (error !== '') {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backLink}>‹ Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  if (all === null) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backLink}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle} numberOfLines={1}>
          Backed up files
        </Text>
        <Text style={styles.count}>{all.length}</Text>
      </View>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={all.slice(0, visible)}
        keyExtractor={f => f.path}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/viewer',
                params: {
                  path: item.path,
                  sizeBytes: String(item.sizeBytes),
                  versionCount: String(item.versionCount),
                  lastModified: String(item.lastModified),
                },
              })
            }>
            <Text style={styles.path} numberOfLines={1}>{item.path}</Text>
            <Text style={styles.meta}>
              {mb(item.sizeBytes)} · v{item.versionCount} ·{' '}
              {new Date(item.lastModified).toLocaleString()}
            </Text>
          </Pressable>
        )}
        ListFooterComponent={
          visible < all.length
            ? <ActivityIndicator style={styles.footer} color={colors.secondary} />
            : all.length === 0
              ? <Text style={[styles.meta, styles.empty]}>Nothing backed up yet</Text>
              : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backLink: { color: colors.primary, fontSize: 16, fontWeight: '600', width: 64 },
  screenTitle: { flex: 1, textAlign: 'center', ...type.headline },
  count: {
    width: 64,
    textAlign: 'right',
    color: colors.muted,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
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
  empty: { textAlign: 'center', marginTop: spacing.xl },
  footer: { marginVertical: spacing.md },
  error: { color: colors.danger, textAlign: 'center' },
});
