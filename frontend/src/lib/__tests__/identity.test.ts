/**
 * Registering this install with the sync server.
 *
 * The rule every test here is really checking: an identity is a convenience,
 * never a precondition. A child with no signal, or a build with no sync
 * server, must reach the end of these paths with `null` and a working app —
 * not an exception.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const BASE = 'https://sync.test';

// SYNC_URL is read once at module load, so the environment has to be set
// before the module is required rather than at the top of the file.
let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;
let identity: typeof import('../identity');

const fetchMock = jest.fn();

beforeAll(() => {
  process.env.EXPO_PUBLIC_SYNC_URL = BASE;
  jest.resetModules();
  const storage = require('@react-native-async-storage/async-storage');
  AsyncStorage = storage.default ?? storage;
  identity = require('../identity');
});

beforeEach(async () => {
  await AsyncStorage.clear();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const registered = (userId = 'u1', secret = 's1') =>
  new Response(JSON.stringify({ userId, secret }), { status: 201 });

describe('ensureRegistered', () => {
  it('registers anonymously and remembers who it became', async () => {
    fetchMock.mockResolvedValueOnce(registered());

    const me = await identity.ensureRegistered();

    expect(me).toEqual({ userId: 'u1', secret: 's1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/v1/users`);
    expect((init as RequestInit).method).toBe('POST');
    // Registration asks for nothing about the child — no body at all.
    expect((init as RequestInit).body).toBeUndefined();

    expect(await identity.loadIdentity()).toEqual({ userId: 'u1', secret: 's1' });
  });

  it('registers once, then reuses what it stored', async () => {
    fetchMock.mockResolvedValueOnce(registered());
    await identity.ensureRegistered();
    const again = await identity.ensureRegistered();

    expect(again?.userId).toBe('u1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up quietly when the device is offline', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(identity.ensureRegistered()).resolves.toBeNull();
    // Nothing half-written: the next launch tries again from scratch.
    expect(await identity.loadIdentity()).toBeNull();
  });

  it('gives up quietly when the server refuses', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }));

    await expect(identity.ensureRegistered()).resolves.toBeNull();
    expect(await identity.loadIdentity()).toBeNull();
  });

  it('ignores a reply missing the credential and keeps nothing', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ userId: 'u1' }), { status: 201 }));

    await expect(identity.ensureRegistered()).resolves.toBeNull();
    expect(await identity.loadIdentity()).toBeNull();
  });

  it('starts again when the stored identity is corrupt', async () => {
    await AsyncStorage.setItem('mathquiz:identity', '{not json');
    fetchMock.mockResolvedValueOnce(registered('u2', 's2'));

    await expect(identity.ensureRegistered()).resolves.toEqual({ userId: 'u2', secret: 's2' });
  });

  it('ignores a stored identity that is missing its secret', async () => {
    await AsyncStorage.setItem('mathquiz:identity', JSON.stringify({ userId: 'u1' }));
    fetchMock.mockResolvedValueOnce(registered('u2', 's2'));

    await expect(identity.ensureRegistered()).resolves.toEqual({ userId: 'u2', secret: 's2' });
  });
});

describe('authHeader', () => {
  it('is the userId and the secret, as the server splits them', () => {
    expect(identity.authHeader({ userId: 'u1', secret: 's1' })).toBe('Bearer u1.s1');
  });
});

describe('with no sync server configured', () => {
  it('never registers and never touches the network', async () => {
    jest.resetModules();
    const saved = process.env.EXPO_PUBLIC_SYNC_URL;
    delete process.env.EXPO_PUBLIC_SYNC_URL;
    try {
      const offline = require('../identity') as typeof import('../identity');
      expect(offline.syncAvailable()).toBe(false);
      await expect(offline.ensureRegistered()).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      process.env.EXPO_PUBLIC_SYNC_URL = saved;
    }
  });
});
