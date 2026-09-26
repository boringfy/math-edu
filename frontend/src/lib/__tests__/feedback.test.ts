/**
 * Sending a suggestion or a bug report.
 *
 * Two things are worth pinning. The context has to actually be attached —
 * that is the whole reason for sending from inside the app rather than asking
 * someone to write an email. And a failure has to come back as words a person
 * can act on, with the typed message left alone, because losing what someone
 * wrote is how you stop them writing again.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../identity', () => ({
  SYNC_URL: 'https://content.example',
  syncAvailable: () => true,
  loadIdentity: jest.fn(async () => null),
  authHeader: (identity: { userId: string; secret: string }) =>
    `Bearer ${identity.userId}.${identity.secret}`,
  fetchWithTimeout: (...args: unknown[]) => (global.fetch as jest.Mock)(...args),
}));

import { deviceId, sendFeedback } from '../feedback';
import { loadIdentity } from '../identity';
import { Grade } from '../../types';

const ok = (status = 201): Response =>
  ({ status, json: async () => ({ id: 'abc', receivedAt: 'now' }) }) as Response;

const sent = (): { url: string; init: RequestInit; body: Record<string, unknown> } => {
  const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
  return { url, init, body: JSON.parse(init.body as string) as Record<string, unknown> };
};

beforeEach(async () => {
  await AsyncStorage.clear();
  global.fetch = jest.fn(async () => ok()) as unknown as typeof fetch;
  (loadIdentity as jest.Mock).mockResolvedValue(null);
});

describe('the device id', () => {
  it('is minted once and kept', async () => {
    const first = await deviceId();
    expect(first).toMatch(/[0-9a-f-]{36}/);
    expect(await deviceId()).toBe(first);
  });

  it('is not stored under a profile, so removing a child keeps it', async () => {
    await deviceId();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toContain('mathquiz:deviceId');
    expect(keys.some((k) => k.startsWith('mathquiz:p:'))).toBe(false);
  });
});

describe('what gets sent', () => {
  it('posts to the feedback route', async () => {
    await sendFeedback({ kind: 'suggestion', message: 'Clocks with hands' });
    expect(sent().url).toBe('https://content.example/v1/feedback');
    expect(sent().init.method).toBe('POST');
  });

  it('carries the kind, so the two land in different categories', async () => {
    await sendFeedback({ kind: 'bug', message: 'The owl spins' });
    expect(sent().body.kind).toBe('bug');
  });

  it('attaches the context nobody wants to be asked for', async () => {
    await sendFeedback({
      kind: 'suggestion',
      message: 'Clocks',
      subject: 'math',
      grade: 2 as Grade,
      profileId: 'kid-7',
    });
    expect(sent().body).toMatchObject({
      subject: 'math',
      grade: 2,
      profileId: 'kid-7',
      platform: expect.any(String),
      appVersion: expect.any(String),
      deviceId: expect.stringMatching(/[0-9a-f-]{36}/),
    });
  });

  it('trims what was typed', async () => {
    await sendFeedback({ kind: 'bug', message: '  it broke  ' });
    expect(sent().body.message).toBe('it broke');
  });

  it('sends no credential when the device never registered', async () => {
    await sendFeedback({ kind: 'bug', message: 'x' });
    expect((sent().init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('sends one when there is an account, so the report can be tied to it', async () => {
    (loadIdentity as jest.Mock).mockResolvedValue({ userId: 'u1', secret: 's1' });
    await sendFeedback({ kind: 'bug', message: 'x' });
    expect((sent().init.headers as Record<string, string>).authorization).toBe('Bearer u1.s1');
  });
});

describe('what comes back', () => {
  it('reports success', async () => {
    expect(await sendFeedback({ kind: 'bug', message: 'x' })).toEqual({ ok: true });
  });

  it('will not send an empty message, and does not call out to say so', async () => {
    const result = await sendFeedback({ kind: 'bug', message: '   ' });
    expect(result.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /* Each failure says something different, because each has a different fix. */
  it('explains a rate limit', async () => {
    global.fetch = jest.fn(async () => ok(429)) as unknown as typeof fetch;
    const result = await sendFeedback({ kind: 'bug', message: 'x' });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('try again later') });
  });

  it('explains a server that is not taking reports', async () => {
    global.fetch = jest.fn(async () => ok(503)) as unknown as typeof fetch;
    const result = await sendFeedback({ kind: 'bug', message: 'x' });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('not taking reports') });
  });

  it('survives the network being gone', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const result = await sendFeedback({ kind: 'bug', message: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('Could not reach');
  });

  it('survives a server that answers with nonsense', async () => {
    global.fetch = jest.fn(async () => ({
      status: 201,
      json: async () => {
        throw new Error('not json');
      },
    })) as unknown as typeof fetch;
    expect(await sendFeedback({ kind: 'bug', message: 'x' })).toEqual({ ok: true });
  });
});
