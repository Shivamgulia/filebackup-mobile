import { syncLibraryIndex } from './media';
import { uploadPending, type UploadSummary } from './upload';
import * as db from './db';

export type SyncResult = { added: number } & UploadSummary;

/** The core loop: diff the library into the index, then upload everything pending. */
export async function syncAndUpload(): Promise<SyncResult> {
  const { added } = await syncLibraryIndex();
  const summary = await uploadPending();
  await db.setMeta('last_sync', String(Date.now()));
  return { added, ...summary };
}
