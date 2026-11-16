import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listFiles, type FileSummary } from './api';
import { FileViewerScreen } from './FileViewerScreen';
import { colors, type as typeScale } from './theme';

const PAGE_SIZE = 20;

const mb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : bytes >= 1024 ? `${(bytes / 1024).toFixed(0)} KB`
  : `${bytes} B`;

/** Browse view of everything backed up from this phone's photos, paginated. */
export function FileListScreen({ onBack }: { onBack: () => void }) {
  const [all, setAll] = useState<FileSummary[] | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<FileSummary | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    listFiles()
      .then(setAll)
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [reloadKey]);

  const loadMore = useCallback(() => {
    setVisible(v => (all && v < all.length ? Math.min(v + PAGE_SIZE, all.length) : v));
  }, [all]);

  if (viewing) {
    return (
      <FileViewerScreen
        item={viewing}
        onBack={() => setViewing(null)}
        onDeleted={() => {
          setViewing(null);
          setReloadKey(k => k + 1);
        }}
      />
    );
  }

  if (error !== '') {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Back" onPress={onBack} />
      </View>
    );
  }
  if (all === null) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>
        Backed up files ({all.length})
      </Text>
      <FlatList
        data={all.slice(0, visible)}
        keyExtractor={f => f.path}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => setViewing(item)}>
            <Text style={styles.path} numberOfLines={1}>{item.path}</Text>
            <Text style={styles.meta}>
              {mb(item.sizeBytes)} · v{item.versionCount} ·{' '}
              {new Date(item.lastModified).toLocaleString()}
            </Text>
          </Pressable>
        )}
        ListFooterComponent={
          visible < all.length
            ? <ActivityIndicator style={styles.footer} />
            : all.length === 0
              ? <Text style={styles.meta}>Nothing backed up yet</Text>
              : undefined
        }
      />
      <Button title="Back" onPress={onBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { ...typeScale.title, fontSize: 20, marginBottom: 8 },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  path: { fontSize: 14, color: colors.fg },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  footer: { marginVertical: 12 },
  error: { color: colors.danger },
});
