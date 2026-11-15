/**
 * End-to-end check of the API contract the mobile app uses:
 * login → initiate → (dedup | PUT blob) → complete → download → re-upload dedup.
 * Run with the dev server up: node scripts/e2e-contract.mjs
 */
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const USER = process.env.FB_USER || 'shivam';
const PASS = process.env.FB_PASS || 'changeme';
const PATH = `photos/2026/01/01/e2e-test-${Date.now()}.txt`;

const assert = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok: ${msg}`);
};

const token = async () => {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  assert(res.status === 200, 'login returns 200');
  return (await res.json()).token;
};

const body = `hello filebackup e2e ${Date.now()}`;
const sha256Hex = (await import('node:crypto')).createHash('sha256').update(body).digest('hex');

const bearer = { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' };

// 1. initiate → presigned URL (new content)
let res = await fetch(`${BASE}/api/uploads`, {
  method: 'POST', headers: bearer,
  body: JSON.stringify({ path: PATH, sha256: sha256Hex, sizeBytes: body.length }),
});
assert(res.status === 200, 'initiate returns 200');
const init = await res.json();
assert(init.status === 'presigned' && init.uploadUrl && init.method === 'PUT', 'initiate returns presigned PUT url');

// 2. PUT the blob to the signed URL (no auth header — signature IS the auth)
res = await fetch(init.uploadUrl, { method: 'PUT', body });
assert(res.status === 204 || res.status === 200, `blob PUT succeeds (${res.status})`);

// 3. complete → version committed
res = await fetch(`${BASE}/api/uploads/complete`, {
  method: 'POST', headers: bearer,
  body: JSON.stringify({ path: PATH, sha256: sha256Hex, sizeBytes: body.length }),
});
assert(res.status === 201, 'complete returns 201');
const complete = await res.json();
assert(complete.path === PATH && complete.version >= 1, `complete reports version ${complete.version}`);

// 4. download → same bytes (server verifies checksum while streaming)
res = await fetch(`${BASE}/api/files/${PATH}`, { headers: { Authorization: bearer.Authorization } });
assert(res.status === 200, 'download returns 200');
assert((await res.text()) === body, 'downloaded bytes match');

// 5. re-initiate same hash → dedup: committed, zero bytes uploaded
res = await fetch(`${BASE}/api/uploads`, {
  method: 'POST', headers: bearer,
  body: JSON.stringify({ path: PATH, sha256: sha256Hex, sizeBytes: body.length }),
});
assert(res.status === 200, 're-initiate returns 200');
const dedup = await res.json();
assert(dedup.status === 'committed', 're-upload with same hash is committed by dedup (no upload)');

console.log('\nALL PASS — the mobile app upload contract works against the live server.');
