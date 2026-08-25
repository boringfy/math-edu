/**
 * Starts the content server.
 *
 * Kept separate from `app.ts` on purpose: importing the routes must not open
 * a socket, or the tests cannot exercise them and two test files cannot run
 * at once.
 */

import { serve } from '@hono/node-server';

import { app, loadManifest } from './app';

const PORT = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  const loaded = loadManifest();
  console.log(`content server on http://localhost:${info.port}`);
  if (loaded) {
    console.log(
      `serving manifest v${loaded.manifest.manifestVersion}, ${loaded.manifest.packs.length} packs`,
    );
  } else {
    console.log('no manifest yet — run `npm run bake`');
  }
});
