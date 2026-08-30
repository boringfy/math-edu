/**
 * The sync routes, driven through app.fetch against an in-memory database —
 * the same no-socket style as the server integration tests, with the Google
 * call mocked the way the tutor's model call is.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../src/server/app';
import { resetSyncDb } from '../src/server/db';
import { clearRateLimits, setGoogleFetch } from '../src/server/sync';
import { PROFILE_SCHEMA_VERSION, PROFILE_MAX_BYTES } from '../src/contract';

const profile = (data: Record<string, unknown> = { coins: 5 }) => ({
  schemaVersion: PROFILE_SCHEMA_VERSION,
  updatedAt: '2026-08-29T00:00:00.000Z',
  data,
});

const asJson = async (res: Response) => (await res.json()) as Record<string, unknown>;

const register = async (): Promise<{ userId: string; secret: string; auth: string }> => {
  const res = await app.fetch(new Request('http://x/v1/users', { method: 'POST' }));
  expect(res.status).toBe(201);
  const body = (await res.json()) as { userId: string; secret: string };
  return { ...body, auth: `Bearer ${body.userId}.${body.secret}` };
};

const putProfile = (auth: string, baseRevision: number, body = profile()) =>
  app.fetch(
    new Request('http://x/v1/profile', {
      method: 'PUT',
      headers: { authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify({ baseRevision, profile: body }),
    }),
  );

const getProfile = (auth: string) =>
  app.fetch(new Request('http://x/v1/profile', { headers: { authorization: auth } }));

const linkGoogle = (auth: string, idToken = 'tok') =>
  app.fetch(
    new Request('http://x/v1/link/google', {
      method: 'POST',
      headers: { authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }),
  );

/** A tokeninfo response Google would give for a valid token. */
const googleOk = (sub: string, aud = 'test-client') =>
  vi.fn(async () => new Response(JSON.stringify({ sub, aud }), { status: 200 }));

beforeEach(() => {
  process.env.SYNC_DB_PATH = ':memory:';
  process.env.GOOGLE_CLIENT_IDS = 'test-client';
  resetSyncDb();
  clearRateLimits();
});

afterEach(() => {
  delete process.env.SYNC_DB_PATH;
  delete process.env.GOOGLE_CLIENT_IDS;
  resetSyncDb();
  setGoogleFetch(fetch);
});

describe('when sync is not configured', () => {
  it('answers 503 without touching anything', async () => {
    delete process.env.SYNC_DB_PATH;
    resetSyncDb();
    expect((await app.fetch(new Request('http://x/v1/users', { method: 'POST' }))).status).toBe(503);
    expect((await getProfile('Bearer a.b')).status).toBe(503);
  });
});

describe('anonymous registration', () => {
  it('hands out a userId and a secret that authenticate', async () => {
    const { auth } = await register();
    // No profile pushed yet, but the credential itself is good.
    expect((await getProfile(auth)).status).toBe(404);
  });

  it('rejects a made-up credential and a wrong secret', async () => {
    const { userId } = await register();
    expect((await getProfile('Bearer nobody.nothing')).status).toBe(401);
    expect((await getProfile(`Bearer ${userId}.wrong-secret`)).status).toBe(401);
    expect((await getProfile('no-bearer')).status).toBe(401);
  });
});

describe('the profile store', () => {
  it('stores, revisions and returns the blob', async () => {
    const { auth } = await register();

    const put = await putProfile(auth, 0, profile({ coins: 12 }));
    expect(put.status).toBe(200);
    expect(await asJson(put)).toEqual({ revision: 1 });

    const got = await getProfile(auth);
    expect(got.status).toBe(200);
    const body = await asJson(got);
    expect(body.revision).toBe(1);
    expect((body.profile as { data: { coins: number } }).data.coins).toBe(12);

    expect(await asJson(await putProfile(auth, 1))).toEqual({ revision: 2 });
  });

  it('answers a stale write with 409 and the stored copy to merge', async () => {
    const { auth } = await register();
    await putProfile(auth, 0, profile({ coins: 50 }));

    // A second device writes from revision 0: conflict, not clobber.
    const conflict = await putProfile(auth, 0, profile({ coins: 1 }));
    expect(conflict.status).toBe(409);
    const body = await asJson(conflict);
    expect(body.revision).toBe(1);
    expect((body.profile as { data: { coins: number } }).data.coins).toBe(50);

    // The merge-and-retry from the served revision goes through.
    expect((await putProfile(auth, 1)).status).toBe(200);
  });

  it('refuses a malformed or oversized profile', async () => {
    const { auth } = await register();
    expect((await putProfile(auth, 0, { nonsense: true } as never)).status).toBe(400);
    const big = profile({ blob: 'x'.repeat(PROFILE_MAX_BYTES) });
    expect((await putProfile(auth, 0, big)).status).toBe(413);
  });

  it('refuses an envelope version it does not know', async () => {
    const { auth } = await register();
    const future = { ...profile(), schemaVersion: PROFILE_SCHEMA_VERSION + 1 };
    expect((await putProfile(auth, 0, future)).status).toBe(400);
  });

  it('refuses a body that is not JSON at all', async () => {
    const { auth } = await register();
    const res = await app.fetch(
      new Request('http://x/v1/profile', {
        method: 'PUT',
        headers: { authorization: auth, 'content-type': 'application/json' },
        body: 'not json',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('refuses a negative or fractional base revision', async () => {
    const { auth } = await register();
    for (const baseRevision of [-1, 1.5]) {
      const res = await app.fetch(
        new Request('http://x/v1/profile', {
          method: 'PUT',
          headers: { authorization: auth, 'content-type': 'application/json' },
          body: JSON.stringify({ baseRevision, profile: profile() }),
        }),
      );
      expect(res.status).toBe(400);
    }
  });

  it('keeps one user’s progress away from another', async () => {
    const alice = await register();
    const bob = await register();
    await putProfile(alice.auth, 0, profile({ coins: 999 }));

    // Bob has pushed nothing, so there is nothing for him to read — least of
    // all Alice's.
    expect((await getProfile(bob.auth)).status).toBe(404);

    await putProfile(bob.auth, 0, profile({ coins: 1 }));
    const hers = await asJson(await getProfile(alice.auth));
    expect((hers.profile as { data: { coins: number } }).data.coins).toBe(999);
  });
});

describe('linking a Google account', () => {
  it('links the first device and keeps its userId as canonical', async () => {
    const { userId, auth } = await register();
    await putProfile(auth, 0, profile({ coins: 9 }));
    setGoogleFetch(googleOk('sub-1') as unknown as typeof fetch);

    const res = await linkGoogle(auth);
    expect(res.status).toBe(200);
    const body = await asJson(res);
    expect(body.userId).toBe(userId);
    expect(body.alreadyLinked).toBe(false);
    expect((body.serverProfile as { revision: number }).revision).toBe(1);

    // The fresh secret works too; the old one still does (same device).
    expect((await getProfile(`Bearer ${userId}.${body.secret as string}`)).status).toBe(200);
    expect((await getProfile(auth)).status).toBe(200);
  });

  it('hands a second device the canonical identity and tombstones its own', async () => {
    setGoogleFetch(googleOk('sub-2') as unknown as typeof fetch);
    const deviceA = await register();
    await putProfile(deviceA.auth, 0, profile({ coins: 100 }));
    await linkGoogle(deviceA.auth);

    const deviceB = await register();
    await putProfile(deviceB.auth, 0, profile({ coins: 3 }));
    const res = await linkGoogle(deviceB.auth);
    const body = await asJson(res);

    expect(body.userId).toBe(deviceA.userId);
    expect(body.alreadyLinked).toBe(true);
    // Device B gets A's profile to merge into its own...
    expect((body.serverProfile as { profile: { data: { coins: number } } }).profile.data.coins).toBe(100);
    // ...its new credential works on the canonical user...
    const authB = `Bearer ${body.userId as string}.${body.secret as string}`;
    expect((await putProfile(authB, 1, profile({ coins: 103 }))).status).toBe(200);
    // ...and its old anonymous identity says where the progress went.
    const gone = await getProfile(deviceB.auth);
    expect(gone.status).toBe(410);
    expect((await asJson(gone)).mergedInto).toBe(deviceA.userId);
  });

  it('refuses a token Google does not vouch for, or for someone else', async () => {
    const { auth } = await register();
    setGoogleFetch(vi.fn(async () => new Response('bad', { status: 400 })) as unknown as typeof fetch);
    expect((await linkGoogle(auth)).status).toBe(401);
    // Right token, wrong audience: minted for some other app.
    setGoogleFetch(googleOk('sub-3', 'someone-elses-client') as unknown as typeof fetch);
    expect((await linkGoogle(auth)).status).toBe(401);
  });

  it('503s when no Google client ids are configured', async () => {
    delete process.env.GOOGLE_CLIENT_IDS;
    const { auth } = await register();
    expect((await linkGoogle(auth)).status).toBe(503);
  });

  it('refuses a request with no token in it', async () => {
    const { auth } = await register();
    const res = await app.fetch(
      new Request('http://x/v1/link/google', {
        method: 'POST',
        headers: { authorization: auth, 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('is safe to link the same account twice from the same device', async () => {
    setGoogleFetch(googleOk('sub-repeat') as unknown as typeof fetch);
    const device = await register();
    await putProfile(device.auth, 0, profile({ coins: 40 }));

    await linkGoogle(device.auth);
    const again = await asJson(await linkGoogle(device.auth));

    // Re-linking is not "another device": the identity stands and nothing is
    // tombstoned, so the device carries on where it was.
    expect(again.userId).toBe(device.userId);
    expect(again.alreadyLinked).toBe(false);
    expect((await getProfile(device.auth)).status).toBe(200);
  });

  it('tells a merged device where its progress went, whatever it asks', async () => {
    setGoogleFetch(googleOk('sub-merged') as unknown as typeof fetch);
    const deviceA = await register();
    await linkGoogle(deviceA.auth);
    const deviceB = await register();
    await linkGoogle(deviceB.auth);

    // Reading, writing and linking again all point at the surviving account
    // rather than quietly writing to a user nobody will read again.
    expect((await getProfile(deviceB.auth)).status).toBe(410);
    expect((await putProfile(deviceB.auth, 0)).status).toBe(410);
    expect((await linkGoogle(deviceB.auth)).status).toBe(410);
    expect((await asJson(await getProfile(deviceB.auth))).mergedInto).toBe(deviceA.userId);
  });
});

describe('rate limiting', () => {
  it('slows down registration floods per address', async () => {
    let last = 201;
    for (let i = 0; i < 40; i++) {
      const res = await app.fetch(
        new Request('http://x/v1/users', {
          method: 'POST',
          headers: { 'x-forwarded-for': '203.0.113.9' },
        }),
      );
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
