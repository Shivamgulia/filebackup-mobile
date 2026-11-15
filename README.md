# FileBackup Mobile

React Native (Expo) app that keeps your phone's photo/video library backed up to your own
FileBackup server. Purpose and API flow overview: `../MOBILE_APP.md`.

## Run it on your phone

1. Start the server (Mac): `cd ../FileBackup && ./mvnw spring-boot:run`
2. Start the app dev server: `npm install && npm start`
3. Scan the QR code with **Expo Go** (iOS camera or Android Expo Go app).
4. Log in with:
   - Server URL: `http://<your-mac-ip>:8080` — find it with `ipconfig getifaddr en0`
     (a phone cannot use `localhost`).
   - The dev credentials from `application-dev.yml` (e.g. `shivam` / `changeme`).
5. Tap **Sync now** — it scans the library, indexes everything, and uploads new items.

## How syncing works

- **On open**: the app diffs the photo library against its local SQLite index and uploads
  anything new (backfill).
- **Manual**: "Sync now" button; "Retry N failed" resets failed uploads.
- **Periodic**: a background task re-runs the loop when the OS allows it.
- **Uploads** go through the server's presigned flow (`POST /api/uploads` → signed PUT →
  `POST /api/uploads/complete`), so already-backed-up content costs zero bytes and the
  server verifies every file's SHA-256 before committing.
- **Deletes never propagate** — removing a photo on the phone never removes the backup.

## Platform reality: background sync

iOS cannot run app code whenever it likes; no app can. Expect:

- uploads to run reliably **when the app is open** (minutes after you take a photo),
- periodic catch-up **hours at worst** via the background task,
- Android to be closer to real-time (foreground work + Headless JS).

This matches Google Photos' behavior — it is not a bug. True background *upload sessions*
(uploads that survive the app being suspended) need a dev build (`npx expo prebuild` +
`react-native-background-upload`); the current uploads run while the app is alive.

## Scripts

- `npm test` — unit tests (path conventions, diff, retry logic)
- `npx tsc --noEmit` — typecheck
- `node scripts/e2e-contract.mjs` — checks the app's upload API contract against a running server
