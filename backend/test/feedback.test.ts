/**
 * Suggestions and bug reports.
 *
 * The write is unauthenticated, so most of what matters here is what it
 * refuses: an empty message, an unknown kind, a client sending in a loop. The
 * rest is about not losing a report over something trivial — a missing grade,
 * a subject this build has never heard of, a credential that has gone stale.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/server/app';
import { openSyncDb, resetSyncDb, syncDb } from '../src/server/db';
import { asFeedbackRequest, clearFeedbackLimits } from '../src/server/feedback';
import { FEEDBACK_LIMITS } from '../src/contract';

const post = async (body: unknown, headers: Record<string, string> = {}): Promise<Response> =>
  app.request('/v1/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: JSON.stringify(body),
  });

const SUGGESTION = {
  kind: 'suggestion',
  message: 'Could we have telling the time on an analogue clock?',
  subject: 'math',
  grade: 2,
  deviceId: 'device-abc',
  profileId: 'kid-1',
  appVersion: '1.0.0',
  platform: 'android',
};

interface Row {
  id: string;
  kind: string;
  message: string;
  subject: string | null;
  grade: number | null;
  device_id: string;
  user_id: string | null;
  profile_id: string | null;
  ip: string;
  app_version: string | null;
  platform: string | null;
}

const rows = (): Row[] =>
  (syncDb()?.prepare('SELECT * FROM feedback ORDER BY created_at').all() ?? []) as unknown as Row[];

beforeEach(() => {
  process.env.SYNC_DB_PATH = ':memory:';
  resetSyncDb();
  clearFeedbackLimits();
});

afterEach(() => {
  delete process.env.SYNC_DB_PATH;
  resetSyncDb();
});

describe('what the request has to carry', () => {
  it('needs a kind it knows', () => {
    expect(asFeedbackRequest({ ...SUGGESTION, kind: 'complaint' })).toBeNull();
    expect(asFeedbackRequest({ ...SUGGESTION, kind: 7 })).toBeNull();
  });

  it('needs something actually written', () => {
    expect(asFeedbackRequest({ ...SUGGESTION, message: '   ' })).toBeNull();
    expect(asFeedbackRequest({ ...SUGGESTION, message: '' })).toBeNull();
    expect(asFeedbackRequest({ ...SUGGESTION, message: 42 })).toBeNull();
  });

  it('takes both kinds', () => {
    expect(asFeedbackRequest({ ...SUGGESTION, kind: 'suggestion' })?.kind).toBe('suggestion');
    expect(asFeedbackRequest({ ...SUGGESTION, kind: 'bug' })?.kind).toBe('bug');
  });

  it('is nothing without a body', () => {
    expect(asFeedbackRequest(null)).toBeNull();
    expect(asFeedbackRequest('a message')).toBeNull();
  });

  /* The rest is context. Missing context must never cost us the report. */

  it('keeps a report whose grade makes no sense', () => {
    expect(asFeedbackRequest({ ...SUGGESTION, grade: 47 })?.grade).toBeUndefined();
    expect(asFeedbackRequest({ ...SUGGESTION, grade: 'two' })?.grade).toBeUndefined();
  });

  it('keeps a subject it does not recognise', () => {
    // An older or newer app naming something this build has never heard of.
    expect(asFeedbackRequest({ ...SUGGESTION, subject: 'science' })?.subject).toBe('science');
  });

  it('stands in for a device that did not say who it is', () => {
    expect(asFeedbackRequest({ ...SUGGESTION, deviceId: undefined })?.deviceId).toBe('unknown');
  });

  it('trims what it is given', () => {
    expect(asFeedbackRequest({ ...SUGGESTION, message: '  spaced  ' })?.message).toBe('spaced');
  });

  it('cuts a message that would fill the disk', () => {
    const long = asFeedbackRequest({ ...SUGGESTION, message: 'x'.repeat(50_000) });
    expect(long?.message).toHaveLength(FEEDBACK_LIMITS.message);
  });
});

describe('storing one', () => {
  it('accepts a suggestion and says what it filed', async () => {
    const response = await post(SUGGESTION);
    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string; receivedAt: string };
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(body.receivedAt))).toBe(false);
    expect(rows()[0].id).toBe(body.id);
  });

  it('records the device, the child and the address', async () => {
    await post(SUGGESTION);
    expect(rows()[0]).toMatchObject({
      device_id: 'device-abc',
      profile_id: 'kid-1',
      ip: '203.0.113.7',
      app_version: '1.0.0',
      platform: 'android',
    });
  });

  it('keeps the two kinds apart', async () => {
    await post(SUGGESTION);
    await post({ ...SUGGESTION, kind: 'bug', message: 'The owl spins for ever.' });
    expect(rows().map((r) => r.kind).sort()).toEqual(['bug', 'suggestion']);
  });

  it('refuses an empty message over the wire', async () => {
    const response = await post({ ...SUGGESTION, message: '' });
    expect(response.status).toBe(400);
    expect(rows()).toHaveLength(0);
  });

  it('refuses a body that is not JSON', async () => {
    const response = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    expect(response.status).toBe(400);
  });

  it('says so when the server has no store configured', async () => {
    delete process.env.SYNC_DB_PATH;
    resetSyncDb();
    expect((await post(SUGGESTION)).status).toBe(503);
  });
});

describe('the address it records', () => {
  it('takes the client, not the proxy nearest us', async () => {
    // Each hop appends, so the client is first. Taking the last would record
    // the same value for every sender.
    await post(SUGGESTION, { 'x-forwarded-for': '198.51.100.5, 10.0.0.1, 10.0.0.2' });
    expect(rows()[0].ip).toBe('198.51.100.5');
  });

  it('falls back to x-real-ip', async () => {
    await post(SUGGESTION, { 'x-forwarded-for': '', 'x-real-ip': '192.0.2.9' });
    expect(rows()[0].ip).toBe('192.0.2.9');
  });

  it('stores the report even when nothing says where it came from', async () => {
    const response = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(SUGGESTION),
    });
    expect(response.status).toBe(201);
    expect(rows()[0].ip).toBeTruthy();
  });
});

describe('the account, when there is one', () => {
  const register = async (): Promise<{ userId: string; secret: string }> => {
    const response = await app.request('/v1/users', { method: 'POST' });
    return (await response.json()) as { userId: string; secret: string };
  };

  it('ties the report to a registered user', async () => {
    const me = await register();
    await post(SUGGESTION, { authorization: `Bearer ${me.userId}.${me.secret}` });
    expect(rows()[0].user_id).toBe(me.userId);
  });

  it('still stores one from a device that never registered', async () => {
    await post(SUGGESTION);
    expect(rows()[0].user_id).toBeNull();
  });

  /* A bad credential is not a reason to lose a bug report. */
  it('stores one with a wrong secret, unattributed', async () => {
    const me = await register();
    await post(SUGGESTION, { authorization: `Bearer ${me.userId}.wrong` });
    expect(rows()).toHaveLength(1);
    expect(rows()[0].user_id).toBeNull();
  });

  it('stores one with a malformed header, unattributed', async () => {
    await post(SUGGESTION, { authorization: 'Bearer nonsense' });
    expect(rows()[0].user_id).toBeNull();
  });
});

describe('one client cannot fill the volume', () => {
  it('starts refusing after a burst', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 25; i++) codes.push((await post(SUGGESTION)).status);
    expect(codes.filter((c) => c === 201)).toHaveLength(20);
    expect(codes.filter((c) => c === 429).length).toBeGreaterThan(0);
  });

  it('budgets each address on its own', async () => {
    for (let i = 0; i < 25; i++) await post(SUGGESTION);
    const other = await post(SUGGESTION, { 'x-forwarded-for': '198.51.100.77' });
    expect(other.status).toBe(201);
  });
});

describe('the table', () => {
  it('is created alongside the sync tables', () => {
    const db = openSyncDb(':memory:');
    const found = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'feedback'")
      .all();
    expect(found).toHaveLength(1);
  });
});
