import { router, useLocalSearchParams } from 'expo-router';
import { FileViewerScreen } from '../screens/FileViewerScreen';
import type { FileSummary } from '../api';

/** Viewer route: params mirror FileSummary (strings on the wire, numbers here). */
export default function Viewer() {
  const { path, sizeBytes, versionCount, lastModified, readOnly } = useLocalSearchParams<{
    path: string;
    sizeBytes: string;
    versionCount: string;
    lastModified: string;
    readOnly?: string;
  }>();

  if (typeof path !== 'string' || path === '') {
    // No file param (e.g. cold deep link) — nothing to show, go back.
    router.replace('/files');
    return null;
  }

  const item: FileSummary = {
    path,
    sizeBytes: Number(sizeBytes) || 0,
    versionCount: Number(versionCount) || 0,
    lastModified: typeof lastModified === 'string' ? lastModified : '',
  };

  return (
    <FileViewerScreen
      item={item}
      readOnly={readOnly === '1'}
      onBack={() => router.back()}
      onDeleted={() => router.back()}
    />
  );
}
