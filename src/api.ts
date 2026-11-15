import * as SecureStore from 'expo-secure-store';

const CREDS_KEY = 'filebackup.session';

let baseUrl = '';
let token = '';
let username = '';

type Stored = { serverUrl: string; username: string; password: string };

async function readStored(): Promise<Stored | null> {
  const raw = await SecureStore.getItemAsync(CREDS_KEY);
  return raw ? (JSON.parse(raw) as Stored) : null;
}

/**
 * Logs in against the server and persists credentials in secure storage
 * (re-login on 401 needs the username/password, not just the token).
 */
export async function login(serverUrl: string, usernameArg: string, password: string): Promise<void> {
  const url = serverUrl.replace(/\/+$/, '');
  const res = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usernameArg, password }),
  });
  if (res.status === 401) throw new Error('Invalid username or password');
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  token = (await res.json()).token;
  baseUrl = url;
  username = usernameArg;
  await SecureStore.setItemAsync(
    CREDS_KEY,
    JSON.stringify({ serverUrl: url, username: usernameArg, password } satisfies Stored),
  );
}

/** Restores a session from secure storage by silently re-logging in. */
export async function restoreSession(): Promise<boolean> {
  const stored = await readStored();
  if (!stored) return false;
  try {
    await login(stored.serverUrl, stored.username, stored.password);
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDS_KEY);
  token = '';
  baseUrl = '';
}

export function getServerUrl(): string {
  return baseUrl;
}

/** Logged-in username; the server scopes uploads under `<username>/` for non-admins. */
export function getUsername(): string {
  return username;
}

/** Auth header for raw requests outside apiFetch (e.g. native download tasks). */
export function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type FileSummary = {
  path: string;
  sizeBytes: number;
  versionCount: number;
  lastModified: string; // ISO instant
};

/** Lists backed-up files under this user's photos prefix. */
export async function listFiles(): Promise<FileSummary[]> {
  const res = await apiFetch(`/api/files?prefix=${encodeURIComponent(`${username}/photos/`)}`);
  if (!res.ok) throw new Error(`List failed (${res.status})`);
  return res.json();
}

/** Tombstone-deletes a backed-up file (soft delete — blobs and history are kept). */
export async function deleteFile(path: string): Promise<void> {
  const res = await apiFetch(`/api/files/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) throw new Error(`Delete failed (${res.status})`);
}

/** Bearer-authenticated fetch. On 401 re-logs in once and retries. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const send = () =>
    fetch(baseUrl + path, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}` },
    });
  let res = await send();
  if (res.status === 401) {
    const stored = await readStored();
    if (!stored) throw new Error('Not logged in');
    await login(stored.serverUrl, stored.username, stored.password);
    res = await send();
    if (res.status === 401) throw new Error('Session expired — please log in again');
  }
  return res;
}

export async function healthCheck(): Promise<string> {
  const res = await apiFetch('/api/health');
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.text();
}
