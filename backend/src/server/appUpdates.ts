/** Expo Updates v1 manifests and immutable assets, stored on the existing backend volume. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Hono } from 'hono';

export const updatesDir = () => process.env.UPDATES_DIR ?? join(process.cwd(), 'data', 'ota');

const appUpdates = new Hono();
const runtimePattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-zA-Z0-9.-]+)?$/;
const assetPattern = /^[a-f0-9]{64}\.(?:bundle|[a-z0-9]{1,8})$/;

appUpdates.get('/v1/app-updates/manifest', (c) => {
  const platform = c.req.header('expo-platform');
  const runtime = c.req.header('expo-runtime-version');
  const channel = c.req.header('expo-channel-name') ?? 'production';
  if (c.req.header('expo-protocol-version') !== '1') return c.json({ error: 'unsupported protocol' }, 406);
  if (platform !== 'ios' && platform !== 'android') return c.json({ error: 'invalid platform' }, 400);
  if (!runtime || !runtimePattern.test(runtime)) return c.json({ error: 'invalid runtime' }, 400);
  if (channel !== 'production' && channel !== 'preview') return c.json({ error: 'invalid channel' }, 400);

  c.header('Cache-Control', 'private, max-age=0, must-revalidate');
  c.header('expo-protocol-version', '1');
  c.header('expo-sfv-version', '0');
  c.header('expo-manifest-filters', '');
  c.header('expo-server-defined-headers', '');

  try {
    const pointer = JSON.parse(readFileSync(join(updatesDir(), 'releases', channel, runtime, 'current.json'), 'utf8')) as { id: string };
    if (!/^[a-f0-9-]{36}$/.test(pointer.id)) throw new Error('invalid release id');
    const published = JSON.parse(readFileSync(join(updatesDir(), 'releases', channel, runtime, pointer.id, `${platform}.json`), 'utf8')) as { body: string; signature: string };
    // Never send an unsigned update, even if the client failed to ask for a signature.
    if (!published.body || !/^[A-Za-z0-9+/=]+$/.test(published.signature)) throw new Error('unsigned update');
    c.header('expo-signature', `sig="${published.signature}", keyid="main"`);
    c.header('Content-Type', 'application/expo+json');
    return c.body(published.body);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return c.body(null, 204);
    console.error('app update manifest unavailable:', error);
    return c.json({ error: 'app update unavailable' }, 503);
  }
});

appUpdates.get('/v1/app-updates/assets/:file', (c) => {
  const file = c.req.param('file');
  if (!assetPattern.test(file)) return c.json({ error: 'not found' }, 404);
  try {
    const bytes = readFileSync(join(updatesDir(), 'assets', file));
    const ext = file.slice(file.lastIndexOf('.') + 1);
    const mime: Record<string, string> = { bundle: 'application/javascript', hbc: 'application/javascript', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', wav: 'audio/wav', mp3: 'audio/mpeg', ttf: 'font/ttf', otf: 'font/otf', webp: 'image/webp' };
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    c.header('Content-Type', mime[ext] ?? 'application/octet-stream');
    return c.body(new Uint8Array(bytes));
  } catch {
    return c.json({ error: 'not found' }, 404);
  }
});

export { appUpdates };
