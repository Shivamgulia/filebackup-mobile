import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  acceptShare,
  declineShare,
  fileMeta,
  listIncomingShares,
  listOutgoingShares,
  revokeShare,
  type Share,
} from '../api';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { LoadingState } from '../components/LoadingState';
import { SectionLabel } from '../components/SectionLabel';
import { TextButton } from '../components/TextButton';
import { colors, spacing, type } from '../theme';

/** Incoming shares (accept/decline/open) and outgoing shares (revoke). */
export function SharedWithMeScreen() {
  const insets = useSafeAreaInsets();
  const [incoming, setIncoming] = useState<Share[] | null>(null);
  const [outgoing, setOutgoing] = useState<Share[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [incomingShares, outgoingShares] = await Promise.all([listIncomingShares(), listOutgoingShares()]);
      setIncoming(incomingShares);
      setOutgoing(outgoingShares);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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

  async function decide(share: Share, accept: boolean) {
    setBusyId(share.shareId);
    setError('');
    try {
      await (accept ? acceptShare(share.shareId) : declineShare(share.shareId));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function open(share: Share) {
    if (share.directory) {
      openFolder(share);
      return;
    }
    setBusyId(share.shareId);
    try {
      const meta = await fileMeta(share.resourcePath);
      router.push({
        pathname: '/viewer',
        params: {
          path: meta.path,
          sizeBytes: String(meta.sizeBytes),
          versionCount: String(meta.versionCount),
          lastModified: meta.lastModified,
          readOnly: '1',
        },
      });
    } catch {
      // No file exactly at the path → it is a folder share.
      openFolder(share);
    } finally {
      setBusyId(null);
    }
  }

  function openFolder(share: Share) {
    router.push({
      pathname: '/shared-folder',
      params: { path: share.resourcePath, owner: share.ownerUsername },
    });
  }

  async function revoke(share: Share) {
    setBusyId(share.shareId);
    setError('');
    try {
      await revokeShare(share.shareId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  if (incoming === null || outgoing === null) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right']}>
        {error !== '' ? <ErrorState message={error} onRetry={load} /> : <LoadingState />}
      </SafeAreaView>
    );
  }

  const pending = incoming.filter(s => s.status === 'pending');
  const accepted = incoming.filter(s => s.status === 'accepted');
  const incomingRows = [...pending, ...accepted];

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}>
        {error !== '' && <Text style={styles.error}>{error}</Text>}

        <SectionLabel>Shared with me</SectionLabel>
        {incomingRows.length === 0 ? (
          <EmptyState text="Nothing shared with you" />
        ) : (
          <ListSection>
            {incomingRows.map((share, index) => (
              <ListRow
                key={share.shareId}
                divider={index > 0}
                disabled={busyId === share.shareId}
                onPress={share.status === 'accepted' ? () => open(share) : undefined}
                style={styles.row}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {name(share.resourcePath)}
                </Text>
                <Text style={styles.rowMeta}>{meta(share)}</Text>
                {share.status === 'pending' ? (
                  <View style={styles.actions}>
                    <TextButton
                      title="Accept"
                      disabled={busyId === share.shareId}
                      onPress={() => decide(share, true)}
                    />
                    <TextButton
                      title="Decline"
                      variant="destructive"
                      disabled={busyId === share.shareId}
                      onPress={() => decide(share, false)}
                    />
                  </View>
                ) : (
                  busyId === share.shareId && (
                    <ActivityIndicator style={styles.rowSpinner} color={colors.secondary} />
                  )
                )}
              </ListRow>
            ))}
          </ListSection>
        )}

        <SectionLabel style={styles.sectionGap}>Shared by me</SectionLabel>
        {outgoing.length === 0 ? (
          <EmptyState text="Nothing shared yet" />
        ) : (
          <ListSection>
            {outgoing.map((share, index) => (
              <ListRow
                key={share.shareId}
                divider={index > 0}
                disabled={busyId === share.shareId}
                style={styles.row}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {name(share.resourcePath)}
                </Text>
                <Text style={styles.rowMeta}>
                  to {share.targetUsername} · {share.status} · {expiry(share)}
                </Text>
                <View style={styles.actions}>
                  <TextButton
                    title="Revoke"
                    variant="destructive"
                    disabled={busyId === share.shareId}
                    onPress={() => revoke(share)}
                  />
                </View>
              </ListRow>
            ))}
          </ListSection>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const name = (path: string) => path.split('/').pop() ?? path;

function meta(share: Share): string {
  const kind = share.directory ? 'folder' : share.permission === 'read_write' ? 'read-write' : 'read-only';
  return `${share.ownerUsername} · ${kind} · ${expiry(share)}`;
}

function expiry(share: Share): string {
  return share.expiresAt === null
    ? 'no expiry'
    : `expires ${new Date(share.expiresAt).toLocaleDateString()}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  sectionGap: { marginTop: spacing.xl },
  row: { gap: spacing.xs },
  rowTitle: { ...type.headline },
  rowMeta: type.meta,
  rowSpinner: { alignSelf: 'flex-end' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  error: { ...type.sub, color: colors.danger, textAlign: 'center' },
});
