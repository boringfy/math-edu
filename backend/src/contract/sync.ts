/**
 * Identity and progress sync: the envelope both halves agree on.
 *
 * The server never reads inside `data` — what progress means is the client's
 * business (see the header of `content.ts`), and keeping the server blind to
 * it means new progress fields never need a server deploy. The server's job
 * is only: who is this, which revision do they have, and store the blob.
 *
 * Identity is two-step and lazy. A device plays with no identity at all
 * until it first manages to reach the server, registers anonymously and gets
 * a `userId` plus an opaque `secret` (sent back as `Authorization: Bearer
 * <userId>.<secret>`). Linking a Google account later makes that same userId
 * reachable from another device.
 */

/** Bumped only when the envelope itself changes shape, not its `data`. */
export const PROFILE_SCHEMA_VERSION = 1;

/** The largest profile PUT the server will store, in bytes of JSON. */
export const PROFILE_MAX_BYTES = 256 * 1024;

export interface Profile {
  schemaVersion: number;
  /** When the client last changed anything in `data` (ISO). */
  updatedAt: string;
  /** The synced progress, opaque to the server. */
  data: Record<string, unknown>;
}

/** POST /v1/users — anonymous registration, no body. */
export interface RegisterResponse {
  userId: string;
  /** Shown once; the server keeps only a hash. Losing it orphans the user. */
  secret: string;
}

/** GET /v1/profile, and the body of a PUT conflict. */
export interface ProfileEnvelope {
  revision: number;
  profile: Profile;
}

/** PUT /v1/profile. `baseRevision` 0 means "I have never synced". */
export interface PutProfileRequest {
  baseRevision: number;
  profile: Profile;
}

/** POST /v1/link/google. */
export interface LinkGoogleRequest {
  /** A Google ID token from the device's sign-in; verified server-side. */
  idToken: string;
}

export interface LinkGoogleResponse {
  /**
   * The canonical identity for this Google account — the caller's own when
   * the account was fresh, or the one it linked first when it was not. The
   * secret is newly minted either way; the client replaces what it stored.
   */
  userId: string;
  secret: string;
  /** True when another device linked this account first. */
  alreadyLinked: boolean;
  /** The canonical user's stored profile, for the client-side merge. */
  serverProfile: ProfileEnvelope | null;
}
