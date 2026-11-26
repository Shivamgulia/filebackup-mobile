import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { File, Paths } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authHeaders, deleteFile, getServerUrl, type FileSummary } from '../api';
import { Icon } from '../components/Icon';
import { colors, layout, spacing, type } from '../theme';

const VIDEO_RE = /\.(mov|mp4|m4v|avi|webm|mkv)$/i;

/** Downloads (with auth) into the cache and returns the local URI. */
export async function downloadToCache(item: FileSummary): Promise<string> {
  const name = item.path.split('/').pop() ?? 'download';
  const url = `${getServerUrl()}/api/files/${item.path.split('/').map(encodeURIComponent).join('/')}`;
  const local = new File(Paths.cache, name);
  // Download tasks don't expose HTTP status; the server's sizeBytes is the integrity check.
  // A stale/garbage cache file (e.g. from an earlier 401) fails the size check and is re-downloaded.
  if (local.exists && local.size !== item.sizeBytes) {
    local.delete();
  }
  if (!local.exists) {
    const task = File.createDownloadTask(url, local, { headers: authHeaders() });
    const downloaded = await task.downloadAsync();
    if (!downloaded || local.size !== item.sizeBytes) {
      if (local.exists) local.delete();
      throw new Error(`Download failed for ${name}`);
    }
  }
  return local.uri;
}

/** In-app viewer with our own back button (the platform preview() can't be customized). */
export function FileViewerScreen({ item, onBack, onDeleted, readOnly = false }: {
  item: FileSummary;
  onBack: () => void;
  onDeleted?: () => void;
  /** Shared files: no delete, no re-upload. */
  readOnly?: boolean;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const isVideo = VIDEO_RE.test(item.path);

  useEffect(() => {
    downloadToCache(item)
      .then(setUri)
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [item]);

  const player = useVideoPlayer(isVideo && uri ? uri : null);

  const confirmDelete = () =>
    Alert.alert('Delete from backup?', `${item.path.split('/').pop()} will be tombstoned on the server (your phone library is untouched).`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteFile(item.path)
            .then(onDeleted ?? onBack)
            .catch(e => setError(e instanceof Error ? e.message : String(e))),
      },
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="chevron-back" size={22} color={colors.onPrimary} />
          <Text style={styles.topAction}>Back</Text>
        </Pressable>
        <Text style={styles.name} numberOfLines={1}>
          {item.path.split('/').pop()}
        </Text>
        {readOnly ? (
          <View style={styles.spacer} />
        ) : (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => pressed && styles.pressed}
            onPress={confirmDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.topAction, styles.delete]}>Delete</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.content}>
        {error !== '' ? (
          <Text style={styles.error}>{error}</Text>
        ) : uri === null ? (
          <ActivityIndicator size="large" color={colors.onPrimary} />
        ) : isVideo ? (
          <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />
        ) : (
          <Image source={{ uri }} style={styles.media} resizeMode="contain" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Black media canvas is intentional; everything on it uses onPrimary white.
  screen: { flex: 1, backgroundColor: '#000' },
  topbar: {
    minHeight: layout.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  pressed: { opacity: 0.6 },
  topAction: { ...type.headline, color: colors.onPrimary },
  // Matches the Delete label's width so the filename stays centered when read-only.
  spacer: { width: 44 },
  delete: { color: colors.danger },
  name: { ...type.headline, color: colors.onPrimary, flex: 1, textAlign: 'center' },
  content: { flex: 1, justifyContent: 'center' },
  media: { flex: 1 },
  error: { ...type.sub, color: colors.danger, textAlign: 'center', padding: spacing.xl },
});
