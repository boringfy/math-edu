/**
 * Backing progress up and picking it up on another device, against a stand-in
 * server that keeps a revision the way the real one does.
 *
 * The pure merge rules are covered in `sync.test.ts`; this is the part around
 * them — who pushes what, what happens when two devices write at once, and
 * what linking an account does to a device that already has progress on it.
 * All of it has to fail softly: an unreachable server costs a retry, never a
 * child's stars.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import type { StopProgress } from '../../types';

const BASE = 'https://sync.test';

let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;
let sync: typeof import('../sync');
let storage: typeof import('../storage');

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

/** A content-blind profile store, like the real one: revision in, blob out. */
class FakeSync {
  revision = 0;
  profile: { schemaVersion: number; updatedAt: string; data: Record<string, unknown> } | null = null;
  puts: { baseRevision: number; profile: { data: Record<string, unknown> } }[] = [];
  linkResponse: unknown = null;
  linkStatus = 200;
  /** Makes the very next request fail, as a flaky network would. */
  offline = false;

  fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    if (this.offline) {
      this.offline = false;
      throw new Error('network down');
    }
    const path = String(url).replace(BASE, '');
    const method = init?.method ?? 'GET';

    if (path === '/v1/users') return json(201, { userId: 'u1', secret: 's1' });

    if (path === '/v1/profile' && method === 'GET') {
      return this.profile
        ? json(200, { revision: this.revision, profile: this.profile })
        : json(404, { error: 'no profile yet' });
    }

    if (path === '/v1/profile' && method === 'PUT') {
      const body = JSON.parse(String(init?.body)) as (typeof this.puts)[number];
      this.puts.push(body);
      if (body.baseRevision !== this.revision) {
        return json(409, { revision: this.revision, profile: this.profile });
      }
      this.revision += 1;
      this.profile = body.profile as typeof this.profile;
      return json(200, { revision: this.revision });
    }

    if (path === '/v1/link/google') return json(this.linkStatus, this.linkResponse);

    throw new Error(`unexpected request: ${method} ${path}`);
  };
}

let server: FakeSync;

const cleared: StopProgress = {
  stars: 3,
  bestPercent: 100,
  clearedAt: '2026-08-01T00:00:00.000Z',
};

/** One child's world, as this device would have written it. */
const kid = (over: Record<string, unknown> = {}) => ({
  grades: { math: 1, reading: 1, logic: 1 },
  tiers: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 },
  coins: 0,
  progress: { math: {}, reading: {}, logic: {} },
  history: [],
  daily: null,
  settings: { scratchPaper: true, penOnly: true },
  adaptive: {},
  ...over,
});

/**
 * A whole device's blob. These tests run before any profile exists, so the
 * one child on them is the nameless one the migration has yet to name.
 */
const remoteProfile = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  updatedAt: '2026-08-28T00:00:00.000Z',
  data: { profiles: { profiles: [], activeId: '' }, kids: { '': kid(over) } },
});

/** Lets the fire-and-forget pushes started inside pull/link actually run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeAll(() => {
  process.env.EXPO_PUBLIC_SYNC_URL = BASE;
  jest.resetModules();
  const mod = require('@react-native-async-storage/async-storage');
  AsyncStorage = mod.default ?? mod;
  sync = require('../sync');
  storage = require('../storage');
});

beforeEach(async () => {
  await AsyncStorage.clear();
  server = new FakeSync();
  global.fetch = server.fetch as unknown as typeof fetch;
  // Registered already, so each test is about syncing rather than signing up.
  await AsyncStorage.setItem(
    'mathquiz:identity',
    JSON.stringify({ userId: 'u1', secret: 's1' }),
  );
});

describe('pushNow', () => {
  it('sends the device profile and remembers the revision it got', async () => {
    await storage.saveCoins(42);

    await expect(sync.pushNow()).resolves.toBe(true);

    expect(server.puts).toHaveLength(1);
    expect(server.puts[0].baseRevision).toBe(0);
    expect((server.puts[0].profile.data.kids as any)[''].coins).toBe(42);

    const meta = await sync.loadSyncMeta();
    expect(meta.dirty).toBe(false);
    expect(meta.lastRevision).toBe(1);
    expect(meta.lastSyncedAt).not.toBeNull();
  });

  it('authenticates as the identity it registered with', async () => {
    const seen: string[] = [];
    const inner = server.fetch;
    global.fetch = (async (url: string, init?: RequestInit) => {
      seen.push(String((init?.headers as Record<string, string>)?.authorization));
      return inner(url, init);
    }) as unknown as typeof fetch;

    await sync.pushNow();
    expect(seen).toContain('Bearer u1.s1');
  });

  it('merges and retries when another device wrote first', async () => {
    // The other device is three revisions ahead with a much richer profile.
    server.revision = 3;
    server.profile = remoteProfile({
      coins: 500,
      progress: { math: { 'g1-l1': cleared }, reading: {}, logic: {} },
    });
    await storage.saveCoins(10);

    await expect(sync.pushNow()).resolves.toBe(true);

    // First attempt is refused, the second goes from the revision it was told.
    expect(server.puts.map((p) => p.baseRevision)).toEqual([0, 3]);
    // Nothing was lost in either direction: the richer coin purse survives...
    expect(await storage.loadCoins()).toBe(500);
    expect((await storage.loadProgress('math'))['g1-l1'].stars).toBe(3);
    // ...and the merged result is what the server ends up holding.
    expect((server.profile?.data.kids as any)?.[''].coins).toBe(500);
    expect(server.revision).toBe(4);
  });

  it('stays dirty when the network fails, so the next launch tries again', async () => {
    await storage.saveCoins(7);
    await sync.markDirtyNow();
    server.offline = true;

    await expect(sync.pushNow()).resolves.toBe(false);

    const meta = await sync.loadSyncMeta();
    expect(meta.dirty).toBe(true);
    expect(meta.lastRevision).toBe(0);
  });

  it('does nothing at all when this device has no identity yet and cannot get one', async () => {
    await AsyncStorage.removeItem('mathquiz:identity');
    server.offline = true;

    await expect(sync.pushNow()).resolves.toBe(false);
    expect(server.puts).toHaveLength(0);
  });
});

describe('pullAndMerge', () => {
  it('folds another device’s progress into this one', async () => {
    server.revision = 2;
    server.profile = remoteProfile({
      coins: 300,
      progress: { math: { 'g1-l2': cleared }, reading: {}, logic: {} },
    });
    await storage.saveCoins(20);
    await storage.saveProgress('math', 'g1-l1', cleared);

    const merged = await sync.pullAndMerge();

    expect(merged?.coins).toBe(300);
    // Both devices' cleared stops are on the map afterwards.
    expect(Object.keys(merged?.progress.math ?? {}).sort()).toEqual(['g1-l1', 'g1-l2']);
    // And the merge is on disk, not just in the return value.
    expect(await storage.loadCoins()).toBe(300);

    await settle();
    // What this device knew that the server did not is sent straight back.
    expect(server.puts).toHaveLength(1);
    expect(Object.keys((server.puts[0].profile.data.kids as any)[''].progress as object)).toContain('math');
  });

  it('backs this device up when the account has never synced', async () => {
    await storage.saveCoins(60);

    await expect(sync.pullAndMerge()).resolves.toBeNull();

    await settle();
    expect(server.puts).toHaveLength(1);
    expect((server.puts[0].profile.data.kids as any)[''].coins).toBe(60);
  });

  it('leaves the device untouched when the server cannot be reached', async () => {
    await storage.saveCoins(15);
    server.offline = true;

    await expect(sync.pullAndMerge()).resolves.toBeNull();
    expect(await storage.loadCoins()).toBe(15);
  });

  it('survives a reply it cannot make sense of', async () => {
    global.fetch = (async () => new Response('not json at all', { status: 200 })) as never;
    await storage.saveCoins(15);

    await expect(sync.pullAndMerge()).resolves.toBeNull();
    expect(await storage.loadCoins()).toBe(15);
  });
});

describe('linkWithGoogle', () => {
  it('adopts the account’s identity and merges what it already had', async () => {
    await storage.saveCoins(50);
    await storage.saveProgress('math', 'g1-l1', cleared);
    server.revision = 5;
    server.linkResponse = {
      userId: 'canonical',
      secret: 'fresh',
      alreadyLinked: true,
      serverProfile: {
        revision: 5,
        profile: remoteProfile({
          coins: 900,
          progress: { math: { 'g1-l9': cleared }, reading: {}, logic: {} },
        }),
      },
    };

    const result = await sync.linkWithGoogle('google-id-token');

    expect(result.status).toBe('merged');
    // This device now speaks as the account, with its own new secret.
    const me = JSON.parse((await AsyncStorage.getItem('mathquiz:identity')) ?? '{}');
    expect(me).toMatchObject({ userId: 'canonical', secret: 'fresh', provider: 'google' });
    // Neither side's progress was dropped on the way in.
    expect(await storage.loadCoins()).toBe(900);
    expect(Object.keys(await storage.loadProgress('math')).sort()).toEqual(['g1-l1', 'g1-l9']);

    await settle();
    // And the union is pushed back up from the revision the account is on.
    expect(server.puts[0].baseRevision).toBe(5);
  });

  it('keeps this device’s progress when it is the first to link', async () => {
    await storage.saveCoins(75);
    server.linkResponse = {
      userId: 'u1',
      secret: 'fresh',
      alreadyLinked: false,
      serverProfile: null,
    };

    const result = await sync.linkWithGoogle('google-id-token');

    expect(result.status).toBe('linked');
    expect(await storage.loadCoins()).toBe(75);
  });

  it('changes nothing when the server rejects the token', async () => {
    server.linkStatus = 401;
    server.linkResponse = { error: 'token was not accepted' };
    await storage.saveCoins(30);

    await expect(sync.linkWithGoogle('bad-token')).resolves.toEqual({ status: 'failed' });

    const me = JSON.parse((await AsyncStorage.getItem('mathquiz:identity')) ?? '{}');
    expect(me.provider).toBeUndefined();
    expect(await storage.loadCoins()).toBe(30);
  });
});
