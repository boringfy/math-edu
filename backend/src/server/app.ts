/**
 * Serves the manifest and the packs.
 *
 * There are only two kinds of response here, and their caching is opposite
 * on purpose:
 *
 *   /v1/manifest   mutable, revalidated, ETagged. The one thing a client
 *                  asks for on launch, and usually a 304.
 *   /packs/*       immutable and content-addressed. Cache for a year; a
 *                  changed pack arrives under a different filename.
 *
 * That split is what keeps a launch cheap: one small conditional request,
 * and nothing else unless content actually moved.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import type { ExplainRequest, Grade, Manifest } from '../contract';
import { DIST_DIR } from '../bake/config';
import { feedback } from './feedback';
import { sync } from './sync';
import { ComposeRequest, asComposeRequest, planLevel } from './levels';
import { TutorError, explain, tutorProviders } from './tutor';
import { appUpdates } from './appUpdates';

/**
 * The manifest is read from disk per request rather than cached in memory,
 * so publishing is "replace the file" and a rollback is "put the old one
 * back" — no restart, no deploy.
 */
function loadManifest(): { manifest: Manifest; body: string; etag: string } | null {
  try {
    const body = readFileSync(join(DIST_DIR, 'manifest.json'), 'utf8');
    return {
      manifest: JSON.parse(body) as Manifest,
      body,
      etag: `"${createHash('sha256').update(body).digest('hex').slice(0, 16)}"`,
    };
  } catch {
    return null;
  }
}

const app = new Hono();

/**
 * Who asked for what. Without this there is no way to tell a device that is
 * quietly failing to update from one that simply has nothing new to fetch —
 * both look like silence.
 */
app.use('*', logger());

// Packs are verbose JSON that gzips about 16:1, so this is the difference
// between a 2MB download and a 90KB one.
app.use('*', compress());

const page = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Have Fun Learning</title><style>body{font:17px/1.55 system-ui,sans-serif;max-width:760px;margin:48px auto;padding:0 20px;color:#182033}h1,h2{line-height:1.2}a{color:#315ee8}</style></head>
<body><h1>${title}</h1>${body}</body></html>`;

app.get('/support', (c) => c.html(page('Support', `
<p>Have Fun Learning provides math, logic and reading practice for grades 1–5.</p>
<h2>Get help</h2><p>Email <a href="mailto:support@hashfront.com">support@hashfront.com</a>. Include the device type and what you were doing when the problem occurred. Do not include a child’s full name.</p>
<h2>Common questions</h2><p>The app works offline. Reading aloud and daily reminders are optional and can be disabled in Settings. Progress syncs through the family’s iCloud account on Apple devices.</p>`)));

app.get('/privacy', (c) => c.html(page('Privacy Policy', `
<p><strong>Last updated September 26, 2026.</strong></p>
<p>Have Fun Learning has no ads, analytics SDKs or third-party advertising trackers. We do not sell personal information.</p>
<h2>Progress</h2><p>On iPhone and iPad, learning progress is stored in the user’s private iCloud key-value store so it can sync across devices signed into the same iCloud account. On other platforms, a pseudonymous identifier may be used to back up progress to our service. Progress includes lessons completed, stars, coins, settings and local player profiles.</p>
<h2>Reading aloud</h2><p>Microphone and speech recognition access is optional. Recognition is requested on-device; the app does not save recordings or send audio to us.</p>
<h2>Feedback</h2><p>If an adult sends feedback, we receive the message, an app-generated identifier, basic app/device details and the network address needed for security and rate limiting.</p>
<h2>Notifications</h2><p>Daily learning reminders are optional local notifications scheduled by the device. We do not use them to track activity.</p>
<h2>Optional usage counts</h2><p>On first launch, a grown-up can choose whether to share usage counts with Hashfront. If allowed, the app sends app-open and completed-lesson events, the subject of a completed lesson, app and operating-system versions, platform, and a random app-install identifier to hashfront.com. It does not send names, answers or scores. The app stores unsent events locally while offline and retries later. Usage sharing can be turned off in Settings; that removes the local tracking identifier and any unsent events. Hashfront stores these usage events to understand which parts of the app are used. No usage event is sent before permission is given.</p>
<h2>Contact</h2><p>Privacy questions: <a href="mailto:privacy@hashfront.com">privacy@hashfront.com</a>.</p>`)));

app.get('/healthz', (c) => {
  const loaded = loadManifest();
  return c.json({
    ok: loaded !== null,
    manifestVersion: loaded?.manifest.manifestVersion ?? null,
    packs: loaded?.manifest.packs.length ?? 0,
  }, loaded ? 200 : 503);
});

app.get('/v1/manifest', (c) => {
  const loaded = loadManifest();
  if (!loaded) {
    return c.json({ error: 'no content has been baked yet' }, 503);
  }

  // The client sends back the ETag it stored, so an unchanged manifest costs
  // a header exchange rather than a body.
  if (c.req.header('if-none-match') === loaded.etag) {
    c.header('ETag', loaded.etag);
    c.header('Cache-Control', 'max-age=300, must-revalidate');
    return c.body(null, 304);
  }

  c.header('ETag', loaded.etag);
  c.header('Cache-Control', 'max-age=300, must-revalidate');
  c.header('Content-Type', 'application/json; charset=utf-8');
  return c.body(loaded.body);
});

/**
 * Packs are served by an explicit handler rather than static middleware, so
 * the headers below are guaranteed rather than dependent on a callback the
 * middleware may or may not reach. It also keeps the filename check in one
 * obvious place.
 */
app.get('/packs/:file', (c) => {
  const name = c.req.param('file');

  // Pack names are generated by the bake and always look like
  // "math.g3.a3f9c2b41d08.json" or "rules.a3f9c2b41d08.json". Anything else
  // is not ours, and refusing by shape means no request can walk out of the
  // packs directory.
  if (!/^[a-z]+(\.g[1-5])?\.[0-9a-f]{12}\.json$/.test(name)) {
    return c.json({ error: 'not found' }, 404);
  }

  let body: string;
  try {
    body = readFileSync(join(DIST_DIR, 'packs', name), 'utf8');
  } catch {
    return c.json({ error: 'not found' }, 404);
  }

  // Safe because the filename carries the content hash: different bytes are
  // always a different URL, so nothing here is ever stale.
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  c.header('Content-Type', 'application/json; charset=utf-8');
  c.header('ETag', `"${name}"`);
  return c.body(body);
});

/** A well-formed ExplainRequest, or null — never a half-checked one. */
function asExplainRequest(body: unknown): ExplainRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.questionId !== 'string' || b.questionId === '') return null;
  if (typeof b.prompt !== 'string' || b.prompt === '') return null;
  if (typeof b.correctAnswer !== 'string') return null;
  if (![1, 2, 3, 4, 5].includes(b.grade as number)) return null;
  if (!Array.isArray(b.choices) || b.choices.some((c) => typeof c !== 'string')) return null;
  return {
    questionId: b.questionId,
    grade: b.grade as Grade,
    prompt: b.prompt,
    correctAnswer: b.correctAnswer,
    choices: b.choices as string[],
  };
}

// The one route a browser calls cross-origin (Expo web in development runs
// on its own port); packs don't need this because web builds bundle content.
app.use('/v1/explain', cors());

/**
 * The AI tutor. On demand and unbaked, unlike everything above: the answer
 * is minted (or served from the tutor's own cache) when a child asks.
 */
app.post('/v1/explain', async (c) => {
  const providers = tutorProviders();
  if (providers.length === 0) {
    return c.json({ error: 'tutor is not configured on this server' }, 503);
  }

  let request: ExplainRequest | null = null;
  try {
    request = asExplainRequest(await c.req.json());
  } catch {
    // Fall through to the 400.
  }
  if (!request) return c.json({ error: 'bad explain request' }, 400);

  try {
    const steps = await explain(request, providers);
    return c.json({ steps });
  } catch (error) {
    // The child's app shows "try again", so the status only has to be honest.
    const reason = error instanceof TutorError ? error.message : String(error);
    console.error(`explain failed for ${request.questionId}: ${reason}`);
    return c.json({ error: reason }, 502);
  }
});

// Identity and progress sync — see server/sync.ts. Every route in it answers
// 503 until SYNC_DB_PATH is set, the same graceful off-switch as the tutor.
/**
 * Planning a level. Unlike the tutor this never answers an error: if no model
 * is configured, or every one of them fails, the deterministic composition is
 * served instead — so the app can always ask, and always gets a level.
 */
app.use('/v1/levels', cors());

app.post('/v1/levels', async (c) => {
  let request: ComposeRequest | null = null;
  try {
    request = asComposeRequest(await c.req.json());
  } catch {
    // Falls through to the 400.
  }
  if (!request) return c.json({ error: 'bad level request' }, 400);

  const plan = await planLevel(request, tutorProviders());
  return c.json(plan);
});

app.route('/', sync);

// Suggestions and bug reports — see server/feedback.ts. Shares the sync
// store, so it shares the 503 when SYNC_DB_PATH is unset.
app.route('/', feedback);
app.route('/', appUpdates);

app.notFound((c) => c.json({ error: 'not found' }, 404));

export { app, loadManifest };
