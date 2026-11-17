import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type AlertButton,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { deleteFile, listFiles, type FileSummary } from '../api';
import { colors, spacing, type } from '../theme';

const PAGE_SIZE = 20;

const mb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : bytes >= 1024 ? `${(bytes / 1024).toFixed(0)} KB`
  : `${bytes} B`;

const SORTS = [
  { key: 'newest', label: 'Newest first', cmp: (a: FileSummary, b: FileSummary) => b.lastModified.localeCompare(a.lastModified) },
  { key: 'oldest', label: 'Oldest first', cmp: (a: FileSummary, b: FileSummary) => a.lastModified.localeCompare(b.lastModified) },
  { key: 'nameAZ', label: 'Name A–Z', cmp: (a: FileSummary, b: FileSummary) => a.path.localeCompare(b.path) },
  { key: 'nameZA', label: 'Name Z–A', cmp: (a: FileSummary, b: FileSummary) => b.path.localeCompare(a.path) },
  { key: 'largest', label: 'Largest first', cmp: (a: FileSummary, b: FileSummary) => b.sizeBytes - a.sizeBytes },
] as const;

/** Browse + search + sort view of everything backed up from this phone. */
export function FileListScreen() {
  const { search } = useLocalSearchParams<{ search?: string }>();
  const [all, setAll] = useState<FileSummary[] | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<(typeof SORTS)[number]['key']>('newest');
  const [searchActive, setSearchActive] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);

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

  // Opened via home's Search row → focus the field immediately.
  useEffect(() => {
    if (search === '1') {
      void Promise.resolve().then(() => {
        setSearchActive(true);
        // let the field mount first
        requestAnimationFrame(() => inputRef.current?.focus());
      });
    }
  }, [search]);

  // Search + sort compose: filter first, then sort.
  const shown = useMemo(() => {
    if (all === null) return null;
    const q = query.trim().toLowerCase();
    const filtered = q === '' ? all : all.filter(f => f.path.toLowerCase().includes(q));
    const sorted = [...filtered].sort(SORTS.find(s => s.key === sortKey)!.cmp);
    return sorted;
  }, [all, query, sortKey]);

  const loadMore = useCallback(() => {
    setVisible(v => (shown && v < shown.length ? Math.min(v + PAGE_SIZE, shown.length) : v));
  }, [shown]);

  function confirmDelete(item: FileSummary) {
    Alert.alert(
      'Delete from backup?',
      `${item.path.split('/').pop()} will be removed from the server (your phone library is untouched).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteFile(item.path)
              .then(() => setAll(l => l?.filter(f => f.path !== item.path) ?? null))
              .catch(e => setError(e instanceof Error ? e.message : String(e))),
        },
      ],
    );
  }

  function pickSort() {
    const buttons: AlertButton[] = SORTS.map(s => ({
      text: sortKey === s.key ? `✓ ${s.label}` : s.label,
      onPress: () => {
        setSortKey(s.key);
        setVisible(PAGE_SIZE);
      },
    }));
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Sort by', undefined, buttons);
  }

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
  if (all === null || shown === null) {
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
          Photos & Videos
        </Text>
        <TouchableOpacity onPress={pickSort} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.sort}>Sort</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          ref={inputRef}
          style={styles.searchField}
          placeholder="Search"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          value={query}
          onFocus={() => setSearchActive(true)}
          onChangeText={t => {
            setQuery(t);
            setVisible(PAGE_SIZE);
          }}
        />
        {(searchActive || query !== '') && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            onPress={() => {
              setQuery('');
              setSearchActive(false);
              inputRef.current?.blur();
            }}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={shown.slice(0, visible)}
        keyExtractor={f => f.path}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
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
            }
            onLongPress={() => confirmDelete(item)}>
            <Text style={styles.path} numberOfLines={1}>{item.path}</Text>
            <Text style={styles.meta}>
              {mb(item.sizeBytes)} · v{item.versionCount} ·{' '}
              {new Date(item.lastModified).toLocaleString()}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          query !== ''
            ? <Text style={[styles.meta, styles.empty]}>{`No matches for "${query.trim()}"`}</Text>
            : <Text style={[styles.meta, styles.empty]}>Nothing backed up yet</Text>
        }
        ListFooterComponent={
          visible < shown.length
            ? <ActivityIndicator style={styles.footer} color={colors.secondary} />
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
  sort: {
    width: 64,
    textAlign: 'right',
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchField: {
    flex: 1,
    backgroundColor: '#E9E9EB', // Apple search-bar gray
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 17,
    color: colors.fg,
  },
  cancel: { color: colors.primary, fontSize: 17 },
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
