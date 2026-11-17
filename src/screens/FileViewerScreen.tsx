import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { File, Paths } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authHeaders, deleteFile, getServerUrl, type FileSummary } from '../api';

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
export function FileViewerScreen({ item, onBack, onDeleted }: {
  item: FileSummary;
  onBack: () => void;
  onDeleted?: () => void;
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
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.topAction}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.name} numberOfLines={1}>
          {item.path.split('/').pop()}
        </Text>
        <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.topAction, styles.delete]}>Delete</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {error !== '' ? (
          <Text style={styles.error}>{error}</Text>
        ) : uri === null ? (
          <ActivityIndicator size="large" color="#fff" />
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
  screen: { flex: 1, backgroundColor: '#000' },
  topbar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topAction: { color: '#fff', fontSize: 16, fontWeight: '600' },
  delete: { color: '#f66' },
  name: { color: '#fff', flex: 1, textAlign: 'center' },
  content: { flex: 1, justifyContent: 'center' },
  media: { flex: 1 },
  error: { color: '#f66', textAlign: 'center', padding: 24 },
});
