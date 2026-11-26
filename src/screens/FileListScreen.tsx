import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type AlertButton,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { deleteFile, listFiles, type FileSummary } from '../api';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Icon } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { listSectionStyle } from '../components/ListSection';
import { LoadingState } from '../components/LoadingState';
import { TextButton } from '../components/TextButton';
import { colors, radius, spacing, type } from '../theme';

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
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<FileSummary[] | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<(typeof SORTS)[number]['key']>('newest');
  const [searchActive, setSearchActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSelectMode, setSelectMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);

  const load = useCallback(async () => {
    try {
      setAll(await listFiles());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Refetch on every focus — covers deletes made in the viewer and app re-opens.
  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

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

  function showActions(item: FileSummary) {
    Alert.alert(item.path.split('/').pop() ?? item.path, undefined, [
      { text: 'Share', onPress: () => share([item.path]) },
      {
        text: 'Select',
        onPress: () => {
          setSelectMode(true);
          setSelected(new Set([item.path]));
        },
      },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(item) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  /** One share form for the whole selection; it creates a pending share per path. */
  function share(paths: string[]) {
    router.push({
      pathname: '/share',
      params: paths.length === 1 ? { path: paths[0] } : { paths: JSON.stringify(paths) },
    });
    exitSelect();
  }

  function toggleSelect(itemPath: string) {
    setSelected(s => {
      const ns = new Set(s);
      if (s.has(itemPath)) ns.delete(itemPath); else ns.add(itemPath);
      return ns;
    });
  }

  function exitSelect() {
    setSelected(new Set());
    setSelectMode(false);
  }

  function deleteSelected() {
    if (selected.size === 0) return;
    const paths = Array.from(selected);
    Alert.alert(
      `Delete ${paths.length} item${paths.length === 1 ? '' : 's'}?`,
      'This will remove the selected files from the server (your phone library is untouched).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Promise.all(paths.map(p => deleteFile(p)))
              .then(() => {
                setAll(l => l?.filter(f => !paths.includes(f.path)) ?? null);
                exitSelect();
              })
              .catch(e => setError(e instanceof Error ? e.message : String(e)));
          },
        },
      ],
    );
  }

  if (error !== '') {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right']}>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }
  if (all === null || shown === null) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <TextButton
                title={isSelectMode ? 'Done' : 'Select'}
                onPress={isSelectMode ? exitSelect : () => setSelectMode(true)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sort"
                onPress={pickSort}
                hitSlop={8}
                style={styles.iconButton}>
                <Icon name="swap-vertical" size={20} color={colors.primary} />
              </Pressable>
            </View>
          ),
        }}
      />

      <View style={styles.searchRow}>
        <TextInput
          ref={inputRef}
          style={styles.searchField}
          placeholder="Search"
          placeholderTextColor={colors.muted}
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
          <TextButton
            title="Cancel"
            variant="quiet"
            onPress={() => {
              setQuery('');
              setSearchActive(false);
              inputRef.current?.blur();
            }}
          />
        )}
      </View>

      <View style={[styles.listWrap, { paddingBottom: isSelectMode ? spacing.sm : insets.bottom }]}>
        <FlatList
          contentContainerStyle={listSectionStyle}
          data={shown.slice(0, visible)}
          keyExtractor={f => f.path}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item, index }) => (
            <ListRow
              divider={index > 0}
              style={styles.row}
              onPress={() => {
                if (isSelectMode) {
                  toggleSelect(item.path);
                } else {
                  router.push({
                    pathname: '/viewer',
                    params: {
                      path: item.path,
                      sizeBytes: String(item.sizeBytes),
                      versionCount: String(item.versionCount),
                      lastModified: String(item.lastModified),
                    },
                  });
                }
              }}
              onLongPress={() => (isSelectMode ? toggleSelect(item.path) : showActions(item))}>
              {isSelectMode && (
                <View style={[styles.checkbox, selected.has(item.path) && styles.checkboxOn]}>
                  {selected.has(item.path) && (
                    <Icon name="checkmark" size={14} color={colors.onPrimary} />
                  )}
                </View>
              )}
              <View style={styles.rowText}>
                <Text style={styles.path} numberOfLines={1}>
                  {item.path}
                </Text>
                <Text style={styles.meta}>
                  {mb(item.sizeBytes)} · v{item.versionCount} ·{' '}
                  {new Date(item.lastModified).toLocaleString()}
                </Text>
              </View>
            </ListRow>
          )}
          ListEmptyComponent={
            <EmptyState
              text={query !== '' ? `No matches for "${query.trim()}"` : 'Nothing backed up yet'}
              style={styles.empty}
            />
          }
          ListFooterComponent={
            visible < shown.length
              ? <ActivityIndicator style={styles.footer} color={colors.secondary} />
              : undefined
          }
        />
      </View>

      {isSelectMode && (
        <View style={[styles.selectBar, { paddingBottom: spacing.md + insets.bottom }]}>
          <TextButton title="Cancel" variant="quiet" onPress={exitSelect} />
          <Text style={styles.barCount}>{selected.size} selected</Text>
          <View style={styles.barActions}>
            <TextButton
              title={`Share (${selected.size})`}
              disabled={selected.size === 0}
              onPress={() => share(Array.from(selected))}
            />
            <TextButton
              title={`Delete (${selected.size})`}
              variant="destructive"
              disabled={selected.size === 0}
              onPress={deleteSelected}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconButton: { minWidth: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchField: {
    flex: 1,
    backgroundColor: colors.fill,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.body,
  },
  listWrap: { flex: 1, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  path: { ...type.bodySm, fontWeight: '500' },
  meta: type.meta,
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderCurve: 'continuous',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  barCount: { ...type.sub, flex: 1, textAlign: 'center' },
  barActions: { flexDirection: 'row', gap: spacing.lg },
  empty: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  footer: { marginVertical: spacing.md },
});
