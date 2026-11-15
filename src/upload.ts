import { File, Paths, UploadType } from 'expo-file-system';
import { Asset } from 'expo-media-library';
import { apiFetch, getUsername } from './api';
import { withRetries } from './retry';
import { computeTargetPath } from './photos';
import * as db from './db';

type InitiateResponse = { status: string; uploadUrl: string | null; method: string | null; version: number | null };
type CompleteResponse = { path: string; version: number };

/**
 * Uploads one indexed asset through the presigned flow:
 * initiate → (dedup commit | PUT blob) → complete. Marks the row uploaded or failed.
 */
export async function uploadOne(assetId: string): Promise<'uploaded' | 'already' | 'failed'> {
  const row = await db.getAsset(assetId);
  if (!row) return 'failed';
  if (row.state === 'uploaded') return 'already';
  try {
    await withRetries(async () => {
      // Photos-library files live outside the app sandbox; URLSession's upload can't
      // read them directly (digest can). Copy into app-owned cache first, upload from there.
      const source = new File(await new Asset(assetId).getUri());
      const cached = new File(Paths.cache, `${assetId.replace(/[^a-zA-Z0-9._-]/g, '_')}-${row.filename}`);
      if (!cached.exists) {
        await source.copy(cached);
      }
      try {
        const sha256 = await cached.digest('SHA-256');
        const sizeBytes = cached.size;
        const path = computeTargetPath(
          { id: row.id, filename: row.filename, mediaType: row.media_type, timestamp: row.created_at },
          getUsername(),
        );
        const body = JSON.stringify({ path, sha256, sizeBytes });

      const initRes = await apiFetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!initRes.ok) throw new Error(`Initiate failed (${initRes.status})`);
      const init: InitiateResponse = await initRes.json();

      if (init.status === 'committed') {
        await db.markUploaded(assetId, sha256, sizeBytes, init.version ?? 0);
        return;
      }
      if (init.status !== 'presigned' || !init.uploadUrl) {
        throw new Error(`Unexpected initiate status: ${init.status}`);
      }

      const put = await cached.upload(init.uploadUrl, {
        httpMethod: (init.method as 'PUT') ?? 'PUT',
        uploadType: UploadType.BINARY_CONTENT,
      });
      if (put.status < 200 || put.status >= 300) {
        throw new Error(`Blob upload failed (${put.status})`);
      }

      const compRes = await apiFetch('/api/uploads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!compRes.ok) throw new Error(`Complete failed (${compRes.status})`);
      const comp: CompleteResponse = await compRes.json();
      await db.markUploaded(assetId, sha256, sizeBytes, comp.version);
      } finally {
        if (cached.exists) cached.delete();
      }
    });
    return 'uploaded';
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[upload] failed ${row.path}:`, message);
    await db.markFailed(assetId, message);
    return 'failed';
  }
}

export type UploadSummary = { total: number; uploaded: number; failed: number };

/** Uploads every pending asset (sequentially — one big video at a time). */
export async function uploadPending(): Promise<UploadSummary> {
  const pending = await db.listPending();
  const summary: UploadSummary = { total: pending.length, uploaded: 0, failed: 0 };
  for (const row of pending) {
    const result = await uploadOne(row.id);
    if (result === 'failed') summary.failed++;
    else summary.uploaded++;
  }
  return summary;
}

/** Resets failed → pending, then runs the queue again. */
export async function retryFailed(): Promise<UploadSummary> {
  await db.resetFailed();
  return uploadPending();
}
