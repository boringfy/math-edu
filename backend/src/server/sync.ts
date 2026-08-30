/**
 * Identity and progress sync.
 *
 * The routes here are deliberately dumb: register hands out a userId and a
 * secret, profile GET/PUT stores one revisioned blob per user, and linking a
 * Google account makes one userId reachable from a second device. What the
 * blob means, and how two devices' progress merges, is the client's business
 * — a conflict is answered with the stored copy (409) and the client sends
 * back what it wants kept.
 *
 * Registration is anonymous and free of any personal detail. Linking stores
 * only Google's opaque subject id — never a name or an email — because the
 * only question the server ever asks is "which userId is this account?".
 */

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { LinkGoogleResponse, Profile, PutProfileRequest } from '../contract';
import { PROFILE_MAX_BYTES, PROFILE_SCHEMA_VERSION } from '../contract';
import { syncDb } from './db';

const hash = (secret: string): string => createHash('sha256').update(secret).digest('hex');

const now = (): string => new Date().toISOString();

/* ------------------------------------------------------------ rate limit -- */

/**
 * Registration and linking mint rows, so they get a small per-address
 * budget; the profile routes are already gated by holding a valid secret.
 * In-memory is enough for a single-node server, and a restart forgiving
 * everyone is fine — this is a speed bump, not a wall.
 */
const RATE_LIMIT = 30;
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
export function clearRateLimits(): void {
  buckets.clear();
}

/* ----------------------------------------------------------------- auth -- */

interface AuthedUser {
  userId: string;
  mergedInto: string | null;
}

/**
 * The bearer credential is "<userId>.<secret>". Only a hash of the secret is
 * stored, and the comparison is constant-time, so neither the database nor
 * the clock leaks it.
 */
function authenticate(db: DatabaseSync, header: string | undefined): AuthedUser | null {
  if (!header?.startsWith('Bearer ')) return null;
  const credential = header.slice('Bearer '.length);
  const dot = credential.indexOf('.');
  if (dot <= 0) return null;
  const userId = credential.slice(0, dot);
  const given = hash(credential.slice(dot + 1));

  const rows = db
    .prepare('SELECT secret_hash FROM secrets WHERE user_id = ?')
    .all(userId) as { secret_hash: string }[];
  const givenBuf = Buffer.from(given, 'hex');
  const match = rows.some((row) => {
    const stored = Buffer.from(row.secret_hash, 'hex');
    return stored.length === givenBuf.length && timingSafeEqual(stored, givenBuf);
  });
  if (!match) return null;

  const user = db.prepare('SELECT merged_into FROM users WHERE id = ?').get(userId) as
    | { merged_into: string | null }
    | undefined;
  if (!user) return null;
  return { userId, mergedInto: user.merged_into };
}

function mintSecret(db: DatabaseSync, userId: string): string {
  const secret = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO secrets (secret_hash, user_id, created_at) VALUES (?, ?, ?)').run(
    hash(secret),
    userId,
    now(),
  );
  return secret;
}

/* ------------------------------------------------------------ validation -- */

/** A well-formed profile PUT, or null — never a half-checked one. */
function asPutProfile(body: unknown): PutProfileRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.baseRevision !== 'number' || !Number.isInteger(b.baseRevision) || b.baseRevision < 0) {
    return null;
  }
  const p = b.profile;
  if (typeof p !== 'object' || p === null) return null;
  const profile = p as Record<string, unknown>;
  // A newer envelope is a client this server does not know how to store yet.
  if (profile.schemaVersion !== PROFILE_SCHEMA_VERSION) return null;
  if (typeof profile.updatedAt !== 'string') return null;
  if (typeof profile.data !== 'object' || profile.data === null || Array.isArray(profile.data)) {
    return null;
  }
  return { baseRevision: b.baseRevision, profile: profile as unknown as Profile };
}

/* --------------------------------------------------------------- google -- */

export interface GoogleConfig {
  clientIds: string[];
}

/** Comma-separated client ids — the Android, iOS and web ids of this app. */
export function googleConfig(env: NodeJS.ProcessEnv = process.env): GoogleConfig | null {
  const raw = env.GOOGLE_CLIENT_IDS ?? '';
  const clientIds = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  return clientIds.length > 0 ? { clientIds } : null;
}

/**
 * Verifies an ID token with Google's tokeninfo endpoint and returns the
 * account's opaque subject id. Plain fetch, no SDK — the same stance as the
 * tutor: one HTTPS call that a test can hand a canned Response.
 */
export async function verifyGoogleToken(
  idToken: string,
  config: GoogleConfig,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const response = await fetchFn(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!response.ok) return null;
  const info = (await response.json()) as { aud?: string; sub?: string; exp?: string };
  if (!info.sub || !info.aud || !config.clientIds.includes(info.aud)) return null;
  if (info.exp !== undefined && Number(info.exp) * 1000 < Date.now()) return null;
  return info.sub;
}

/** Swapped by tests; the routes read it per request. */
let googleFetch: typeof fetch = fetch;
export function setGoogleFetch(fetchFn: typeof fetch): void {
  googleFetch = fetchFn;
}

/* ---------------------------------------------------------------- routes -- */

const readProfile = (db: DatabaseSync, userId: string) => {
  const row = db
    .prepare('SELECT revision, blob FROM profiles WHERE user_id = ?')
    .get(userId) as { revision: number; blob: string } | undefined;
  return row ? { revision: row.revision, profile: JSON.parse(row.blob) as Profile } : null;
};

export const sync = new Hono();

// All of these are called from Expo web in development, like /v1/explain.
sync.use('/v1/users', cors());
sync.use('/v1/profile', cors());
sync.use('/v1/link/*', cors());

sync.post('/v1/users', (c) => {
  const db = syncDb();
  if (!db) return c.json({ error: 'sync is not configured on this server' }, 503);
  const address = c.req.header('x-forwarded-for') ?? 'direct';
  if (overLimit(`users:${address}`)) return c.json({ error: 'too many registrations' }, 429);

  const userId = randomUUID();
  db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run(userId, now());
  const secret = mintSecret(db, userId);
  return c.json({ userId, secret }, 201);
});

sync.get('/v1/profile', (c) => {
  const db = syncDb();
  if (!db) return c.json({ error: 'sync is not configured on this server' }, 503);
  const user = authenticate(db, c.req.header('authorization'));
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  if (user.mergedInto) return c.json({ mergedInto: user.mergedInto }, 410);

  const stored = readProfile(db, user.userId);
  if (!stored) return c.json({ error: 'no profile yet' }, 404);
  return c.json(stored);
});

sync.put('/v1/profile', async (c) => {
  const db = syncDb();
  if (!db) return c.json({ error: 'sync is not configured on this server' }, 503);
  const user = authenticate(db, c.req.header('authorization'));
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  if (user.mergedInto) return c.json({ mergedInto: user.mergedInto }, 410);

  let request: PutProfileRequest | null = null;
  try {
    request = asPutProfile(await c.req.json());
  } catch {
    // Fall through to the 400.
  }
  if (!request) return c.json({ error: 'bad profile request' }, 400);
  if (JSON.stringify(request.profile).length > PROFILE_MAX_BYTES) {
    return c.json({ error: 'profile too large' }, 413);
  }

  const stored = readProfile(db, user.userId);
  const current = stored?.revision ?? 0;
  // A stale base means another device wrote since this one last looked. The
  // stored copy goes back so the client can merge and try again.
  if (request.baseRevision !== current) {
    return c.json({ revision: current, profile: stored?.profile ?? null }, 409);
  }

  const revision = current + 1;
  db.prepare(
    `INSERT INTO profiles (user_id, revision, updated_at, blob) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET revision = ?, updated_at = ?, blob = ?`,
  ).run(
    user.userId,
    revision,
    request.profile.updatedAt,
    JSON.stringify(request.profile),
    revision,
    request.profile.updatedAt,
    JSON.stringify(request.profile),
  );
  return c.json({ revision });
});

sync.post('/v1/link/google', async (c) => {
  const db = syncDb();
  if (!db) return c.json({ error: 'sync is not configured on this server' }, 503);
  const config = googleConfig();
  if (!config) return c.json({ error: 'linking is not configured on this server' }, 503);

  const user = authenticate(db, c.req.header('authorization'));
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  if (user.mergedInto) return c.json({ mergedInto: user.mergedInto }, 410);

  const address = c.req.header('x-forwarded-for') ?? 'direct';
  if (overLimit(`link:${address}`)) return c.json({ error: 'too many attempts' }, 429);

  let idToken = '';
  try {
    const body = (await c.req.json()) as Record<string, unknown>;
    if (typeof body.idToken === 'string') idToken = body.idToken;
  } catch {
    // Fall through to the 400.
  }
  if (!idToken) return c.json({ error: 'bad link request' }, 400);

  const subject = await verifyGoogleToken(idToken, config, googleFetch);
  if (!subject) return c.json({ error: 'token was not accepted' }, 401);

  const linked = db
    .prepare("SELECT user_id FROM identities WHERE provider = 'google' AND subject = ?")
    .get(subject) as { user_id: string } | undefined;

  if (!linked) {
    // First device to link this account: the caller's userId becomes the
    // canonical one, with a fresh secret so the old one can be retired.
    db.prepare(
      "INSERT INTO identities (provider, subject, user_id, created_at) VALUES ('google', ?, ?, ?)",
    ).run(subject, user.userId, now());
    const response: LinkGoogleResponse = {
      userId: user.userId,
      secret: mintSecret(db, user.userId),
      alreadyLinked: false,
      serverProfile: readProfile(db, user.userId),
    };
    return c.json(response);
  }

  const canonical = linked.user_id;
  if (canonical !== user.userId) {
    // A second device joins: it gets its own secret on the canonical user,
    // and its anonymous user is tombstoned pointing at where it went. The
    // caller merges the returned profile locally and PUTs the result.
    db.prepare('UPDATE users SET merged_into = ? WHERE id = ?').run(canonical, user.userId);
  }
  const response: LinkGoogleResponse = {
    userId: canonical,
    secret: mintSecret(db, canonical),
    alreadyLinked: canonical !== user.userId,
    serverProfile: readProfile(db, canonical),
  };
  return c.json(response);
});
