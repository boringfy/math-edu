/**
 * The real bake, through the real HTTP handlers.
 *
 * Hono's `app.fetch` is the actual request pipeline, so this exercises the
 * caching headers, the ETag round trip and the pack routes without opening a
 * socket. The caching split is the part worth pinning: get it backwards and
 * either every launch re-downloads 15MB, or a published change never
 * reaches anybody.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { Manifest, SCHEMA_VERSION } from '../src/contract';
import { DIST_DIR } from '../src/bake/config';
import { bake } from '../src/bake/bake';
import { app } from '../src/server/app';

let manifest: Manifest;

beforeAll(() => {
  // Bake once so the server has something real to serve.
  manifest = bake();
});

const get = (path: string, headers?: Record<string, string>) =>
  app.fetch(new Request(`http://localhost${path}`, { headers }));

describe('the bake', () => {
  it('writes a manifest and every pack it names', () => {
    expect(manifest.packs).toHaveLength(16);
    for (const pack of manifest.packs) {
      expect(existsSync(join(DIST_DIR, pack.url.replace('/packs/', 'packs/')))).toBe(true);
    }
  });

  it('names each pack file after its content hash', () => {
    for (const pack of manifest.packs) {
      expect(pack.url).toContain(pack.id);
      // The filename carries the hash, which is what makes the URL immutable.
      expect(pack.url).toMatch(/\.[0-9a-f]{12}\.json$/);
    }
  });

  it('records a hash that matches the bytes on disk', () => {
    for (const pack of manifest.packs) {
      const body = readFileSync(join(DIST_DIR, pack.url.replace('/packs/', 'packs/')), 'utf8');
      expect(Buffer.byteLength(body, 'utf8')).toBe(pack.bytes);
    }
  });

  it('keeps pack versions stable when nothing changed', () => {
    const again = bake();
    for (const pack of again.packs) {
      const before = manifest.packs.find((p) => p.id === pack.id);
      expect(pack.version).toBe(before?.version);
      expect(pack.sha256).toBe(before?.sha256);
    }
    // And the manifest itself does not churn.
    expect(again.manifestVersion).toBe(manifest.manifestVersion);
  });

  it('covers all three subjects for all five grades, plus the rules', () => {
    const ids = manifest.packs.map((p) => p.id).sort();
    expect(ids).toContain('rules');
    for (const grade of [1, 2, 3, 4, 5]) {
      expect(ids).toContain(`math.g${grade}`);
      expect(ids).toContain(`reading.g${grade}`);
      expect(ids).toContain(`logic.g${grade}`);
    }
  });
});

describe('GET /v1/manifest', () => {
  it('serves the manifest with a short, revalidated cache', async () => {
    const response = await get('/v1/manifest?platform=android&appVersion=1.0.0');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('max-age=300, must-revalidate');
    expect(response.headers.get('etag')).toBeTruthy();

    const body = (await response.json()) as Manifest;
    expect(body.packs).toHaveLength(16);
    expect(body.packs.every((p) => p.schemaVersion === SCHEMA_VERSION)).toBe(true);
  });

  it('answers a matching ETag with 304 and no body', async () => {
    const first = await get('/v1/manifest');
    const etag = first.headers.get('etag')!;

    const second = await get('/v1/manifest', { 'If-None-Match': etag });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
  });

  it('serves the body again when the ETag does not match', async () => {
    const response = await get('/v1/manifest', { 'If-None-Match': '"stale"' });
    expect(response.status).toBe(200);
  });
});

describe('GET /packs/*', () => {
  it('serves a pack as immutable, cacheable for a year', async () => {
    const pack = manifest.packs.find((p) => p.id === 'reading.g1')!;
    const response = await get(pack.url);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  it('serves bytes that hash to what the manifest promised', async () => {
    const { createHash } = await import('node:crypto');
    const pack = manifest.packs.find((p) => p.id === 'rules')!;
    const body = await (await get(pack.url)).text();

    expect(createHash('sha256').update(body, 'utf8').digest('hex')).toBe(pack.sha256);
  });

  it('serves a pack the client can actually parse', async () => {
    const pack = manifest.packs.find((p) => p.id === 'math.g1')!;
    const body = JSON.parse(await (await get(pack.url)).text());

    expect(body.kind).toBe('math');
    expect(body.schemaVersion).toBe(SCHEMA_VERSION);
    expect(body.catalog.length).toBeGreaterThan(0);
    expect(Object.keys(body.pools).length).toBeGreaterThan(0);
  });

  it('404s an unknown pack rather than serving something else', async () => {
    expect((await get('/packs/does-not-exist.json')).status).toBe(404);
  });
});

describe('GET /healthz', () => {
  it('reports the manifest it is serving', async () => {
    const response = await get('/healthz');
    expect(response.status).toBe(200);

    const body = (await response.json()) as { ok: boolean; packs: number };
    expect(body.ok).toBe(true);
    expect(body.packs).toBe(16);
  });
});
