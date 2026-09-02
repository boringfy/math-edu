/**
 * The wire protocol.
 *
 * One mutable manifest points at immutable, content-addressed packs.
 * Publishing is "write a new manifest"; rolling back is "write the old one
 * back". Packs are never edited in place, so any pack URL can be cached for
 * ever and a half-finished download can never corrupt what is already there.
 */

import type { Grade } from './content';

/**
 * Bumped only when a pack's SHAPE changes incompatibly. The client refuses
 * packs whose schemaVersion it does not know, which is what lets the server
 * roll a new shape out to new clients while old ones keep the last pack they
 * can actually read.
 */
export const SCHEMA_VERSION = 1;

export type PackId =
  | `math.g${Grade}`
  | `reading.g${Grade}`
  | `logic.g${Grade}`
  | 'rules';

export interface PackDescriptor {
  id: PackId;
  /** Bumped by the bake whenever the pack's content hash changes. */
  version: number;
  /** Hex SHA-256 of the pack body, verified after download. */
  sha256: string;
  /** Path relative to the content host, e.g. "/packs/math.g3.a3f9c2.json". */
  url: string;
  bytes: number;
  schemaVersion: number;
  /**
   * The oldest app build that can render this pack. A client below it keeps
   * whatever version it already had, so shipping content that needs a newer
   * renderer never breaks an app that has not been updated yet.
   */
  minAppVersion: string;
  /**
   * ISO 8601 of when this pack's *source* last changed — not when the bake
   * ran. It is what lets a client tell two copies of the same pack apart.
   *
   * The app ships a full set of packs in its binary and also downloads them.
   * Without a stamp there is nothing to compare: `version` restarts at 1 on
   * every clean build (see `versionFor`), and the content hash does not
   * order. So a device that had once downloaded a pack kept it for ever, and
   * content shipped inside a newer app build could never take over from a
   * server that had not been redeployed. That is exactly how a grade-2
   * reading map stayed at 60 stories while the binary carried 120.
   *
   * Optional because manifests baked before this existed do not carry it, and
   * a device may still be holding a cache index from one. Absent means
   * "unknown", which loses to any known stamp on the other side.
   */
  bakedAt?: string;
}

export interface Manifest {
  manifestVersion: number;
  /** ISO 8601. Informational — freshness is decided by pack versions. */
  generatedAt: string;
  /** Apps older than this should prompt the user to update. */
  minSupportedApp: string;
  packs: PackDescriptor[];
}

/** What the client keeps on disk about what it has already downloaded. */
export interface CacheIndex {
  manifestVersion: number;
  /** Pack id -> the descriptor it was stored under. */
  packs: Record<string, PackDescriptor>;
  /** ISO 8601 of the last successful manifest check, for throttling. */
  checkedAt: string;
  /** Last manifest ETag, sent back as If-None-Match. */
  etag?: string;
}
