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
  return listFilesAt(`${username}/photos/`);
}

/** Lists files under any prefix the caller can read (own prefix, or a folder shared with them). */
export async function listFilesAt(prefix: string): Promise<FileSummary[]> {
  const res = await apiFetch(`/api/files?prefix=${encodeURIComponent(prefix)}`);
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

// --- role + admin user management ---

export type Me = { username: string; admin: boolean };

/** Fetches the token's role info (admin flag comes from the server's config, not the client). */
export async function me(): Promise<Me> {
  const res = await apiFetch('/api/auth/me');
  if (!res.ok) throw new Error(`Whoami failed (${res.status})`);
  return res.json();
}

export type AdminUser = { username: string; role: string; suspended: boolean; createdAt: string };

export async function setUserRole(target: string, role: 'user' | 'admin'): Promise<void> {
  const res = await apiFetch(`/api/admin/users/${encodeURIComponent(target)}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error((await res.json())?.message ?? `Role change failed (${res.status})`);
}

export async function listUsers(): Promise<AdminUser[]> {
  const res = await apiFetch('/api/admin/users');
  if (!res.ok) throw new Error(`List users failed (${res.status})`);
  return res.json();
}

export async function createUser(username: string, password: string): Promise<void> {
  const res = await apiFetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json())?.message ?? `Create failed (${res.status})`);
}

export async function changePassword(target: string, password: string): Promise<void> {
  const res = await apiFetch(`/api/admin/users/${encodeURIComponent(target)}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error((await res.json())?.message ?? `Password change failed (${res.status})`);
}

export async function setSuspended(target: string, suspended: boolean): Promise<void> {
  const res = await apiFetch(`/api/admin/users/${encodeURIComponent(target)}/suspension`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspended }),
  });
  if (!res.ok) throw new Error((await res.json())?.message ?? `Suspension failed (${res.status})`);
}

// --- sharing ---

export type ShareStatus = 'pending' | 'accepted' | 'declined';

export type Share = {
  shareId: string;
  ownerUsername: string;
  targetUsername: string;
  resourcePath: string;
  permission: 'read' | 'read_write';
  status: ShareStatus;
  directory?: boolean;
  createdAt: string;
  expiresAt: string | null;
  revoked: boolean;
};

export type CreateShareInput = {
  targetUsername: string;
  resourcePath: string;
  permission: 'read' | 'read_write';
  expiresAt?: string | null;
};

/** Shares a file/folder path; it stays pending until the recipient accepts. */
export async function createShare(input: CreateShareInput): Promise<Share> {
  const params = new URLSearchParams({
    targetUsername: input.targetUsername,
    resourcePath: input.resourcePath,
    permission: input.permission,
  });
  if (input.expiresAt) params.set('expiresAt', input.expiresAt);
  const res = await apiFetch(`/api/shares?${params.toString()}`);
  if (!res.ok) throw new Error(`Share failed (${res.status})`);
  return res.json();
}

export async function listOutgoingShares(): Promise<Share[]> {
  const res = await apiFetch('/api/shares');
  if (!res.ok) throw new Error(`List shares failed (${res.status})`);
  return res.json();
}

/** Shares other users created for this account, pending ones included. */
export async function listIncomingShares(): Promise<Share[]> {
  const res = await apiFetch('/api/shares/incoming');
  if (!res.ok) throw new Error(`List shared files failed (${res.status})`);
  return res.json();
}

export async function acceptShare(shareId: string): Promise<void> {
  await shareAction(shareId, 'accept');
}

export async function declineShare(shareId: string): Promise<void> {
  await shareAction(shareId, 'decline');
}

export async function revokeShare(shareId: string): Promise<void> {
  const res = await apiFetch(`/api/shares/${encodeURIComponent(shareId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Revoke failed (${res.status})`);
}

async function shareAction(shareId: string, action: 'accept' | 'decline'): Promise<void> {
  const res = await apiFetch(`/api/shares/${encodeURIComponent(shareId)}/${action}`, { method: 'POST' });
  if (!res.ok) throw new Error(`${action === 'accept' ? 'Accept' : 'Decline'} failed (${res.status})`);
}

/** HEAD metadata for a path — also works for files shared with you. */
export async function fileMeta(path: string): Promise<FileSummary> {
  const res = await apiFetch(`/api/files/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'HEAD',
  });
  if (!res.ok) throw new Error(`Not available (${res.status})`);
  return {
    path,
    sizeBytes: Number(res.headers.get('Content-Length') ?? 0),
    versionCount: Number(res.headers.get('X-Version') ?? 1),
    lastModified: res.headers.get('Last-Modified') ?? '',
  };
}
