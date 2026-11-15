/** Pure helpers for the photo index — no native imports, so it runs in Jest unchanged. */

export type PhotoAsset = {
  id: string;
  filename: string;
  mediaType: string;
  /** Unix seconds (the server-agnostic, library-agnostic form). */
  timestamp: number;
};

/** Server-side path convention: [owner/]photos/<filename> — flat, no date subdirectories.
 *  The server scopes uploads under `<username>/` for every user (admin included). */
export function computeTargetPath(a: PhotoAsset, owner: string): string {
  const name = a.filename || a.id.replace(/[^a-zA-Z0-9._-]/g, '_');
  const prefix = owner ? `${owner}/` : '';
  return `${prefix}photos/${name}`;
}

export function pickNew<T extends { id: string }>(assets: T[], knownIds: Set<string>): T[] {
  return assets.filter(a => !knownIds.has(a.id));
}
