/** Publish a signed Expo export to the existing backend volume. No server restart. */
import { createHash, randomUUID, sign } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { updatesDir } from '../server/appUpdates';

type AssetMeta = { path: string; ext: string };
type PlatformMeta = { bundle: string; assets: AssetMeta[] };
type ExportMeta = { fileMetadata: { ios: PlatformMeta; android: PlatformMeta } };

const args = process.argv.slice(2);
const value = (name: string) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const requireValue = (name: string) => {
  const result = value(name);
  if (!args.includes(name) || !result || result.startsWith('--')) throw new Error(`Missing ${name}`);
  return result;
};

export function publish(options: { exportDir: string; channel: 'production' | 'preview'; runtime: string; keyPath: string; baseUrl: string; storageDir: string; expoClient: object }) {
  const { exportDir, channel, runtime, keyPath, baseUrl, storageDir, expoClient } = options;
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(runtime)) throw new Error('Invalid runtime version');
  if (!/^https:\/\/[^/]+$/.test(baseUrl)) throw new Error('Base URL must be an HTTPS origin');
  const privateKey = readFileSync(keyPath);
  const metadata = JSON.parse(readFileSync(join(exportDir, 'metadata.json'), 'utf8')) as ExportMeta;
  if (!metadata.fileMetadata?.ios?.bundle || !metadata.fileMetadata?.android?.bundle) throw new Error('Export must include iOS and Android');
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const releaseDir = join(storageDir, 'releases', channel, runtime, id);
  const assetDir = join(storageDir, 'assets');
  mkdirSync(releaseDir, { recursive: true });
  mkdirSync(assetDir, { recursive: true });

  const asset = (relativePath: string, extension: string, isLaunchAsset: boolean) => {
    if (relativePath.startsWith('/') || relativePath.split('/').includes('..') || !/^[\w./-]+$/.test(relativePath)) throw new Error(`Unsafe asset path: ${relativePath}`);
    if (!/^[a-z0-9]{1,8}$/.test(extension)) throw new Error(`Invalid asset extension: ${extension}`);
    const source = join(exportDir, relativePath);
    const bytes = readFileSync(source);
    const digest = createHash('sha256').update(bytes).digest();
    const hex = digest.toString('hex');
    const filename = `${hex}.${isLaunchAsset ? 'bundle' : extension}`;
    const target = join(assetDir, filename);
    if (!existsSync(target)) copyFileSync(source, target);
    const mime: Record<string, string> = { wav: 'audio/wav', mp3: 'audio/mpeg', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', ttf: 'font/ttf', otf: 'font/otf' };
    return {
      hash: digest.toString('base64url'),
      key: createHash('md5').update(bytes).digest('hex'),
      contentType: isLaunchAsset ? 'application/javascript' : (mime[extension] ?? 'application/octet-stream'),
      fileExtension: `.${isLaunchAsset ? 'bundle' : extension}`,
      url: `${baseUrl}/v1/app-updates/assets/${filename}`,
    };
  };

  for (const platform of ['ios', 'android'] as const) {
    const files = metadata.fileMetadata[platform];
    const manifest = {
      id, createdAt, runtimeVersion: runtime,
      launchAsset: asset(files.bundle, 'bundle', true),
      assets: files.assets.map((item) => asset(item.path, item.ext, false)),
      metadata: {},
      extra: { expoClient },
    };
    const body = JSON.stringify(manifest);
    const signature = sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64');
    writeFileSync(join(releaseDir, `${platform}.json`), JSON.stringify({ body, signature }));
  }

  const pointerDir = join(storageDir, 'releases', channel, runtime);
  const temporaryPointer = join(pointerDir, `current.${id}.tmp`);
  writeFileSync(temporaryPointer, JSON.stringify({ id }));
  renameSync(temporaryPointer, join(pointerDir, 'current.json'));
  return id;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const channel = requireValue('--channel');
    if (channel !== 'production' && channel !== 'preview') throw new Error('Channel must be production or preview');
    const expoConfig = (JSON.parse(readFileSync(requireValue('--app-config'), 'utf8')) as { expo: object }).expo;
    if (!expoConfig) throw new Error('App config has no expo object');
    const id = publish({
      exportDir: resolve(requireValue('--export-dir')),
      channel,
      runtime: requireValue('--runtime'),
      keyPath: resolve(requireValue('--key')),
      baseUrl: requireValue('--base-url'),
      storageDir: resolve(value('--storage-dir') ?? updatesDir()),
      expoClient: expoConfig,
    });
    console.log(`Published ${channel} update ${id} for iOS and Android`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
