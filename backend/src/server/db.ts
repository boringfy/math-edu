/**
 * The sync store: one SQLite file, opened lazily.
 *
 * Sync is the first part of this server that remembers anything between
 * requests, and SQLite through `node:sqlite` keeps that cheap: no service to
 * run, no driver to install, a file on a volume that a backup can copy. Like
 * the tutor, the whole feature is switched on by an environment variable —
 * no `SYNC_DB_PATH`, and every sync route answers 503 while content serving
 * carries on untouched.
 */

import { createRequire } from 'node:module';
import type { DatabaseSync } from 'node:sqlite';

// Loaded through require rather than an import statement: vitest's bundler
// predates node:sqlite and tries to resolve it as an npm package, while
// node:module is old enough that every tool leaves it alone.
const { DatabaseSync: SqliteDatabase } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL,
    -- Set when this anonymous user was folded into a linked account; the
    -- row stays so the old device is told where its progress went.
    merged_into TEXT
  );
  -- A user can hold several secrets: each device that linked the same
  -- account keeps its own, so authorizing a new device revokes nobody.
  CREATE TABLE IF NOT EXISTS secrets (
    secret_hash TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS identities (
    provider   TEXT NOT NULL,
    subject    TEXT NOT NULL,
    user_id    TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    PRIMARY KEY (provider, subject)
  );
  CREATE TABLE IF NOT EXISTS profiles (
    user_id    TEXT PRIMARY KEY REFERENCES users(id),
    revision   INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    blob       TEXT NOT NULL
  );
`;

export function openSyncDb(path: string): DatabaseSync {
  const db = new SqliteDatabase(path);
  // One writer at a time is plenty here, but WAL keeps readers from ever
  // blocking on it. Skipped in memory, where it is meaningless.
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

let handle: { path: string; db: DatabaseSync } | null = null;

/** The configured store, opened once and reused, or null when sync is off. */
export function syncDb(env: NodeJS.ProcessEnv = process.env): DatabaseSync | null {
  const path = env.SYNC_DB_PATH ?? '';
  if (!path) return null;
  if (!handle || handle.path !== path) {
    handle?.db.close();
    handle = { path, db: openSyncDb(path) };
  }
  return handle.db;
}

/** Test hook: drops the cached handle so each test starts clean. */
export function resetSyncDb(): void {
  try {
    handle?.db.close();
  } catch {
    // Already closed is fine; the point is to forget it.
  }
  handle = null;
}
