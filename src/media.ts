import {
  Query,
  AssetField,
  MediaType,
  requestPermissionsAsync,
} from 'expo-media-library';
import { pickNew, type PhotoAsset } from './photos';
import { getUsername } from './api';
import * as db from './db';

const PAGE = 100;

/** Walks the whole Photos library (paged via offset) into the plain index form. */
export async function loadLibrary(): Promise<PhotoAsset[]> {
  const perm = await requestPermissionsAsync();
  if (!perm.granted) throw new Error('Photo library permission denied');

  const assets: PhotoAsset[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await new Query()
      .within(AssetField.MEDIA_TYPE, [MediaType.IMAGE, MediaType.VIDEO])
      .orderBy(AssetField.CREATION_TIME)
      .limit(PAGE)
      .offset(offset)
      .exeForMetadata();
    for (const a of page) {
      assets.push({
        id: a.id,
        filename: a.filename ?? '',
        mediaType: a.mediaType,
        // expo-media-library gives ms (nullable); index keeps unix seconds, 0 = unknown date
        timestamp: a.creationTime != null ? Math.floor(a.creationTime / 1000) : 0,
      });
    }
    if (page.length < PAGE) break;
  }
  return assets;
}

/** Full diff pass: library → index. Returns counts for the status screen. */
export async function syncLibraryIndex(): Promise<{ total: number; added: number }> {
  const assets = await loadLibrary();
  const owner = getUsername();
  const known = new Set(await db.allAssetIds());
  const added = await db.insertNewAssets(pickNew(assets, known), owner);
  await db.setMeta('last_sync', String(Date.now()));
  return { total: assets.length, added };
}
