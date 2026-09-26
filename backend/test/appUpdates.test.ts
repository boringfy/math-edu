import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/server/app';
import { publish } from '../src/updates/publish';

const root = mkdtempSync(join(tmpdir(), 'math-edu-updates-'));
const storage = join(root, 'ota');
const exportDir = join(root, 'export');
const keyPath = join(root, 'key.pem');
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const headers = { 'expo-protocol-version': '1', 'expo-platform': 'ios', 'expo-runtime-version': '1.0.0', 'expo-channel-name': 'production', 'expo-expect-signature': 'sig, keyid="main", alg="rsa-v1_5-sha256"' };
const get = (path: string, requestHeaders = headers) => app.fetch(new Request(`http://localhost${path}`, { headers: requestHeaders }));

beforeAll(() => {
  process.env.UPDATES_DIR = storage;
  mkdirSync(join(exportDir, 'assets'), { recursive: true });
  writeFileSync(keyPath, keys.privateKey.export({ format: 'pem', type: 'pkcs8' }));
  writeFileSync(join(exportDir, 'ios.hbc'), 'ios bundle');
  writeFileSync(join(exportDir, 'android.hbc'), 'android bundle');
  writeFileSync(join(exportDir, 'assets', 'sound'), 'sound');
  writeFileSync(join(exportDir, 'metadata.json'), JSON.stringify({ fileMetadata: {
    ios: { bundle: 'ios.hbc', assets: [{ path: 'assets/sound', ext: 'wav' }] },
    android: { bundle: 'android.hbc', assets: [{ path: 'assets/sound', ext: 'wav' }] },
  } }));
});
afterAll(() => { delete process.env.UPDATES_DIR; rmSync(root, { recursive: true, force: true }); });

describe('signed app updates', () => {
  it('keeps the embedded build when no release exists', async () => {
    expect((await get('/v1/app-updates/manifest')).status).toBe(204);
  });

  it('rejects unsupported versions, platforms, channels, and traversal', async () => {
    expect((await get('/v1/app-updates/manifest', { ...headers, 'expo-protocol-version': '2' })).status).toBe(406);
    expect((await get('/v1/app-updates/manifest', { ...headers, 'expo-platform': 'web' })).status).toBe(400);
    expect((await get('/v1/app-updates/manifest', { ...headers, 'expo-runtime-version': '../1.0.0' })).status).toBe(400);
    expect((await get('/v1/app-updates/manifest', { ...headers, 'expo-channel-name': '../preview' })).status).toBe(400);
    expect((await get('/v1/app-updates/assets/../../key.pem')).status).toBe(404);
  });

  it('publishes and serves signed manifests for both platforms and hashed assets', async () => {
    const id = publish({ exportDir, storageDir: storage, channel: 'production', runtime: '1.0.0', keyPath, baseUrl: 'https://math-edu.hashfront.com', expoClient: { name: 'Have Fun Learning' } });
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    for (const platform of ['ios', 'android']) {
      const response = await get('/v1/app-updates/manifest', { ...headers, 'expo-platform': platform });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toContain('max-age=0');
      const body = await response.text();
      const manifest = JSON.parse(body);
      expect(manifest.id).toBe(id);
      expect(manifest.runtimeVersion).toBe('1.0.0');
      expect(manifest.launchAsset.url).toContain('/v1/app-updates/assets/');
      const signature = response.headers.get('expo-signature')!.match(/sig="([^"]+)"/)![1];
      expect(verify('RSA-SHA256', Buffer.from(body), keys.publicKey, Buffer.from(signature, 'base64'))).toBe(true);
      const assetPath = new URL(manifest.assets[0].url).pathname;
      const asset = await get(assetPath);
      expect(asset.status).toBe(200);
      expect(asset.headers.get('cache-control')).toContain('immutable');
      const bytes = Buffer.from(await asset.arrayBuffer());
      expect(createHash('sha256').update(bytes).digest('base64url')).toBe(manifest.assets[0].hash);
    }
    expect((await get('/v1/app-updates/manifest', { ...headers, 'expo-runtime-version': '1.0.1' })).status).toBe(204);
    expect((await get('/v1/app-updates/manifest', { ...headers, 'expo-channel-name': 'preview' })).status).toBe(204);
    expect(readFileSync(join(storage, 'releases', 'production', '1.0.0', 'current.json'), 'utf8')).toContain(id);
  });
});
