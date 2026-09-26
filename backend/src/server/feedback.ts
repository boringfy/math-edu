/**
 * Suggestions and bug reports from the settings page.
 *
 * One route, two kinds, one table. The route is deliberately forgiving about
 * everything except the message: a report that arrives with a missing grade
 * or an unrecognised subject is still a report, and the point of asking is to
 * hear back, not to police a form. What it will not do is store an empty
 * message, or let one client fill the disk.
 *
 * Writing is unauthenticated on purpose. A parent hitting a bug is often
 * hitting it *because* sync never registered, and demanding a credential
 * would lose exactly the reports worth having. A bearer token is read if one
 * is offered, so a report from a synced device can be tied to its account,
 * but it is never required.
 *
 * Reading is not exposed at all. These rows carry IP addresses, so they are
 * for whoever holds the database file:
 *
 *   sqlite3 "$SYNC_DB_PATH" \
 *     "SELECT created_at, subject, message FROM feedback
 *       WHERE kind = 'suggestion' ORDER BY created_at DESC LIMIT 20;"
 */

import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';

import type { FeedbackKind, FeedbackRequest, FeedbackResponse } from '../contract';
import { FEEDBACK_KINDS, FEEDBACK_LIMITS } from '../contract';
import { syncDb } from './db';

/* ------------------------------------------------------------ rate limit -- */

/**
 * A per-address budget, the same shape as the one in `sync.ts`. Higher than
 * registration's because a person hitting a real bug may reasonably send
 * several reports in a sitting, and low enough that a script cannot fill a
 * volume through it. In-memory, so a restart forgives everyone — a speed
 * bump, not a wall.
 */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function overLimit(address: string): boolean {
  const bucket = buckets.get(address);
  if (!bucket || bucket.resetAt < Date.now()) {
    buckets.set(address, { count: 1, resetAt: Date.now() + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

/** Test hook. */
export function clearFeedbackLimits(): void {
  buckets.clear();
}

/* -------------------------------------------------------------- request -- */

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed.slice(0, max);
};

/**
 * The request, or null when there is nothing worth storing.
 *
 * Only two fields can fail it: a kind that is not one of the two, and an
 * empty message. Everything else is context, and context that is missing or
 * malformed is dropped rather than made into an error — a bug report is worth
 * more than the metadata attached to it.
 */
export function asFeedbackRequest(body: unknown): FeedbackRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const raw = body as Record<string, unknown>;

  const kind = raw.kind;
  if (typeof kind !== 'string' || !FEEDBACK_KINDS.includes(kind as FeedbackKind)) return null;

  const message = text(raw.message, FEEDBACK_LIMITS.message);
  if (message === null) return null;

  const grade = typeof raw.grade === 'number' && Number.isInteger(raw.grade) ? raw.grade : undefined;

  return {
    kind: kind as FeedbackKind,
    message,
    subject: text(raw.subject, FEEDBACK_LIMITS.subject) ?? undefined,
    grade: grade !== undefined && grade >= 1 && grade <= 5 ? (grade as FeedbackRequest['grade']) : undefined,
    deviceId: text(raw.deviceId, FEEDBACK_LIMITS.deviceId) ?? 'unknown',
    profileId: text(raw.profileId, FEEDBACK_LIMITS.profileId) ?? undefined,
    appVersion: text(raw.appVersion, FEEDBACK_LIMITS.appVersion) ?? undefined,
    platform: text(raw.platform, FEEDBACK_LIMITS.platform) ?? undefined,
  };
}

/* -------------------------------------------------------------- address -- */

/**
 * Who sent it, as well as can be known.
 *
 * `x-forwarded-for` is a list appended to by each hop, so the client is the
 * first entry — taking the last would record the proxy nearest us, which is
 * the same value for everyone. Behind no proxy the header is absent and the
 * socket knows; if even that fails, 'unknown' is stored rather than dropping
 * the report, because the address is context and the message is the point.
 */
export function clientAddress(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = c.req.header('x-real-ip')?.trim();
  if (real) return real.slice(0, 64);
  try {
    return getConnInfo(c).remote.address?.slice(0, 64) ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/* ----------------------------------------------------------------- auth -- */

const hash = (secret: string): string => createHash('sha256').update(secret).digest('hex');

/**
 * The account behind the bearer token, if one was offered and it checks out.
 *
 * Never an error: an absent, malformed or stale credential simply means the
 * report is stored without a user id. This is not a gate, it is a label.
 */
export function optionalUser(db: DatabaseSync, header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const credential = header.slice('Bearer '.length);
  const dot = credential.indexOf('.');
  if (dot <= 0) return null;
  const userId = credential.slice(0, dot);
  const given = hash(credential.slice(dot + 1));

  const rows = db
    .prepare('SELECT secret_hash FROM secrets WHERE user_id = ?')
    .all(userId) as { secret_hash: string }[];
  return rows.some((row) => row.secret_hash === given) ? userId : null;
}

/* --------------------------------------------------------------- routes -- */

export const feedback = new Hono();

// Expo web in development calls this cross-origin, the same as /v1/explain.
feedback.use('/v1/feedback', cors());

feedback.post('/v1/feedback', async (c) => {
  const db = syncDb();
  // Feedback shares the sync store, so it shares its switch. Saying so plainly
  // lets the app hide the form rather than offer a button that goes nowhere.
  if (!db) return c.json({ error: 'feedback is not configured on this server' }, 503);

  const address = clientAddress(c);
  if (overLimit(`feedback:${address}`)) {
    return c.json({ error: 'too many reports, try again later' }, 429);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'expected a JSON body' }, 400);
  }

  const request = asFeedbackRequest(body);
  if (!request) return c.json({ error: 'need a kind of suggestion or bug, and a message' }, 400);

  const id = randomUUID();
  const receivedAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO feedback
       (id, kind, created_at, message, subject, grade,
        device_id, user_id, profile_id, ip, app_version, platform)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    request.kind,
    receivedAt,
    request.message,
    request.subject ?? null,
    request.grade ?? null,
    request.deviceId,
    optionalUser(db, c.req.header('authorization')),
    request.profileId ?? null,
    address,
    request.appVersion ?? null,
    request.platform ?? null,
  );

  const response: FeedbackResponse = { id, receivedAt };
  return c.json(response, 201);
});
