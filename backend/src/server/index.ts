/**
 * Starts the content server.
 *
 * Kept separate from `app.ts` on purpose: importing the routes must not open
 * a socket, or the tests cannot exercise them and two test files cannot run
 * at once.
 */

import { serve } from '@hono/node-server';

import { app, loadManifest } from './app';
import { tutorProviders } from './tutor';

// The tutor's key lives in backend/.env, which is gitignored. A missing file
// just means the tutor endpoint answers 503; content still serves.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url).pathname);
} catch {
  // No .env — environment variables may still be set by the shell or Docker.
}

const PORT = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  const loaded = loadManifest();
  console.log(`content server on http://localhost:${info.port}`);
  const providers = tutorProviders();
  console.log(
    providers.length === 0
      ? 'tutor off — set TUTOR_LLM_* to enable'
      : `tutor: ${providers.map((p) => `${p.label} ${p.model}`).join(' -> ')}`,
  );
  if (loaded) {
    console.log(
      `serving manifest v${loaded.manifest.manifestVersion}, ${loaded.manifest.packs.length} packs`,
    );
  } else {
    console.log('no manifest yet — run `npm run bake`');
  }
});
