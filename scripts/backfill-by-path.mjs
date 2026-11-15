/**
 * One-time backfill: creates by-path entries (real file names) for files stored
 * before the by-path view existed. Re-initiating with the stored hash dedup-commits
 * without re-uploading bytes. Run as the admin user while the server is up:
 *   node scripts/backfill-by-path.mjs
 */
const BASE = process.env.BASE_URL || 'http://localhost:8080';

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: process.env.FB_USER || 'shivam',
    password: process.env.FB_PASS || 'changeme',
  }),
});
const token = (await login.json()).token;
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const files = await (await fetch(`${BASE}/api/files`, { headers: auth })).json();
let fixed = 0;
for (const f of files) {
  const head = await fetch(`${BASE}/api/files/${f.path.split('/').map(encodeURIComponent).join('/')}`,
    { headers: { Authorization: auth.Authorization } });
  const sha256 = head.headers.get('x-checksum-sha256');
  if (!sha256) { console.log(`skip (no checksum): ${f.path}`); continue; }
  const res = await fetch(`${BASE}/api/uploads`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ path: f.path, sha256, sizeBytes: f.sizeBytes }),
  });
  console.log(`${res.ok ? 'linked' : 'FAILED'}: ${f.path}`);
  if (res.ok) fixed++;
}
console.log(`\n${fixed}/${files.length} files exposed under data/files/`);
