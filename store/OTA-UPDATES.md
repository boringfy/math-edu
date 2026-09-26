# Self-hosted app updates

The installed iOS and Android binaries check `https://math-edu.hashfront.com/v1/app-updates/manifest` on launch. This is separate from `/v1/manifest`, which serves lesson packs. New JavaScript and bundled assets download in the background and run on the next app launch. The embedded app remains usable if the update service is unavailable. Updates are signed and restricted to the binary's runtime version (`1.0.0` currently).

Native code, permissions, Expo SDK/native dependency changes, app icon, and store metadata still require a new App Store / Play Store build and review. Apple may also require review for changes that materially alter the app's purpose or features; keep OTA changes within the reviewed app's functionality.

## Publishing

1. Build and ship binaries containing `expo-updates` and the public certificate first. Binaries installed before this change cannot receive OTA updates.
2. Deploy the backend code to the existing `math-edu.hashfront.com` service. Its `./data` bind mount stores immutable assets and release pointers; make a backup of it. Do not put the signing private key in that mount, a container image, or git.
3. Export from `frontend`: `npx expo export --platform all --output-dir /tmp/math-edu-ota-export`. Keep this export for rollback.
4. Run the publisher from `backend` (replace the key path with the secure location on the publishing machine):

   `npm run updates:publish -- --export-dir /tmp/math-edu-ota-export --channel production --runtime 1.0.0 --key /secure/path/ota-signing-key.pem --base-url https://math-edu.hashfront.com --storage-dir ../data/ota --app-config ../frontend/app.json`

The publisher requires both platform bundles, stages every asset and signed manifest, then atomically swaps `current.json`; no backend restart is required. It cannot publish to an arbitrary URL: the `--base-url` names the public backend used by asset URLs, and `--storage-dir` must be the backend's mounted `data/ota` directory. Run the same command with `--channel preview` only for a separately configured preview binary. Production binaries have the `production` header embedded in native config.

Verify the public endpoint with headers `expo-protocol-version: 1`, `expo-platform: ios` (then `android`), and `expo-runtime-version: 1.0.0`. Both should return a signed manifest and asset URLs returning 200. A missing release returns 204. Never put a production pointer in place before the backend route is deployed and the new binaries are installed.

For rollback, republish a retained known-good export under the same runtime; that creates a newer signed manifest. Do not merely change `current.json` to an older release, since clients may already have an update with a newer creation time. A runtime version change needs new store binaries. Keep the private key backed up securely; losing it prevents publishing updates to binaries trusting this certificate. If compromised, release new store binaries with a new certificate.
