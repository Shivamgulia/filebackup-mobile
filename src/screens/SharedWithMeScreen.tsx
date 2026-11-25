import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { colors, radius, spacing, type } from '../theme';

/** Incoming shares (accept/decline/open) and outgoing shares (revoke). */
export function SharedWithMeScreen() {
  const [incoming, setIncoming] = useState<Share[] | null>(null);
  const [outgoing, setOutgoing] = useState<Share[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </SafeAreaView>
    );
  }

  const pending = incoming.filter(s => s.status === 'pending');
  const accepted = incoming.filter(s => s.status === 'accepted');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sharing</Text>
        <View style={styles.back} />
      </View>

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={type.caption}>SHARED WITH ME</Text>
        {incoming.length === 0 && <Text style={styles.empty}>Nothing shared with you</Text>}

        {pending.map(share => (
          <View key={share.shareId} style={styles.row}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {name(share.resourcePath)}
            </Text>
            <Text style={styles.rowMeta}>{meta(share)}</Text>
            <View style={styles.actions}>
              <Pressable
                disabled={busyId === share.shareId}
                onPress={() => decide(share, true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.accept}>Accept</Text>
              </Pressable>
              <Pressable
                disabled={busyId === share.shareId}
                onPress={() => decide(share, false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.decline}>Decline</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {accepted.map(share => (
          <Pressable
            key={share.shareId}
            style={styles.row}
            disabled={busyId === share.shareId}
            onPress={() => open(share)}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {name(share.resourcePath)}
            </Text>
            <Text style={styles.rowMeta}>{meta(share)}</Text>
            {busyId === share.shareId && <ActivityIndicator style={styles.rowSpinner} color={colors.secondary} />}
          </Pressable>
        ))}

        <Text style={[type.caption, styles.sectionGap]}>SHARED BY ME</Text>
        {outgoing.length === 0 && <Text style={styles.empty}>Nothing shared yet</Text>}

        {outgoing.map(share => (
          <View key={share.shareId} style={styles.row}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {name(share.resourcePath)}
            </Text>
            <Text style={styles.rowMeta}>
              to {share.targetUsername} · {share.status} · {expiry(share)}
            </Text>
            <Pressable
              disabled={busyId === share.shareId}
              onPress={() => revoke(share)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.decline}>Revoke</Text>
            </Pressable>
          </View>
        ))}
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
  centered: { justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600', width: 64 },
  title: { flex: 1, textAlign: 'center', ...type.headline },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  sectionGap: { marginTop: spacing.xl },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 4,
  },
  rowTitle: { ...type.headline },
  rowMeta: { ...type.sub, fontSize: 13 },
  rowSpinner: { alignSelf: 'flex-end' },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  accept: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  decline: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  empty: { ...type.sub, paddingVertical: spacing.sm },
  error: { color: colors.danger, textAlign: 'center', paddingHorizontal: spacing.lg },
});
