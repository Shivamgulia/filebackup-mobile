import * as SQLite from 'expo-sqlite';
import { computeTargetPath, type PhotoAsset } from './photos';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('filebackup.db');
    await db.execAsync(`CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      filename TEXT NOT NULL,
      media_type TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      sha256 TEXT,
      state TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL)`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    // migration for installs created before error tracking; "duplicate column" is fine
    try {
      await db.execAsync(`ALTER TABLE assets ADD COLUMN error TEXT`);
    } catch { /* already exists */ }
  }
  return db;
}

/** Inserts assets not already indexed (by id). Returns how many were added. */
export async function insertNewAssets(assets: PhotoAsset[], owner: string): Promise<number> {
  if (assets.length === 0) return 0;
  const conn = await getDb();
  let added = 0;
  for (const a of assets) {
    const res = await conn.runAsync(
      `INSERT OR IGNORE INTO assets (id, path, filename, media_type, state, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      a.id, computeTargetPath(a, owner), a.filename, a.mediaType, a.timestamp, Date.now(),
    );
    added += res.changes;
  }
  return added;
}

export async function allAssetIds(): Promise<string[]> {
  const conn = await getDb();
  const rows = await conn.getAllAsync<{ id: string }>('SELECT id FROM assets');
  return rows.map(r => r.id);
}

export async function getStateCounts(): Promise<{ total: number; uploaded: number; pending: number; failed: number }> {
  const conn = await getDb();
  const rows = await conn.getAllAsync<{ state: string; n: number }>(
    'SELECT state, COUNT(*) AS n FROM assets GROUP BY state',
  );
  const byState = Object.fromEntries(rows.map(r => [r.state, r.n]));
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  return {
    total,
    uploaded: byState['uploaded'] ?? 0,
    pending: byState['pending'] ?? 0,
    failed: byState['failed'] ?? 0,
  };
}

export type AssetRow = {
  id: string;
  path: string;
  filename: string;
  media_type: string;
  size: number;
  sha256: string | null;
  state: 'pending' | 'uploaded' | 'failed';
  error?: string | null;
  /** unix seconds the asset was created (mirrors the media library timestamp) */
  created_at: number;
};

export async function getAsset(id: string): Promise<AssetRow | null> {
  const conn = await getDb();
  return conn.getFirstAsync<AssetRow>('SELECT * FROM assets WHERE id = ?', id);
}

export async function markUploaded(id: string, sha256: string, size: number, version: number): Promise<void> {
  const conn = await getDb();
  await conn.runAsync(
    `UPDATE assets SET state = 'uploaded', sha256 = ?, size = ?, updated_at = ? WHERE id = ?`,
    sha256, size, Date.now(), id,
  );
  await setMeta(`version:${id}`, String(version));
}

export async function markFailed(id: string, error: string): Promise<void> {
  const conn = await getDb();
  await conn.runAsync(
    `UPDATE assets SET state = 'failed', error = ?, updated_at = ? WHERE id = ?`,
    error, Date.now(), id,
  );
}

/** Resets all failed assets to pending (the "retry" button). */
export async function resetIndex(): Promise<void> {
  const conn = await getDb();
  await conn.execAsync('DELETE FROM assets; DELETE FROM meta;');
}

export async function resetFailed(): Promise<number> {
  const conn = await getDb();
  const res = await conn.runAsync(
    `UPDATE assets SET state = 'pending', error = NULL, updated_at = ? WHERE state = 'failed'`,
    Date.now(),
  );
  return res.changes;
}

export async function listPending(limit = 1000): Promise<AssetRow[]> {
  const conn = await getDb();
  return conn.getAllAsync<AssetRow>(
    `SELECT * FROM assets WHERE state = 'pending' ORDER BY created_at LIMIT ?`, limit,
  );
}

export async function listFailed(limit = 100): Promise<AssetRow[]> {
  const conn = await getDb();
  return conn.getAllAsync<AssetRow>(
    `SELECT * FROM assets WHERE state = 'failed' ORDER BY updated_at DESC LIMIT ?`, limit,
  );
}

export async function getMeta(key: string): Promise<string | null> {
  const conn = await getDb();
  const row = await conn.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?', key,
  );
  return row ? row.value : null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const conn = await getDb();
  await conn.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, value,
  );
}
