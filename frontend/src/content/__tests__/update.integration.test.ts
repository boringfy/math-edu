/**
 * The whole update path, end to end, with nothing faked but the network
 * socket: a real manifest, real pack bodies, real SHA-256 verification, a
 * real filesystem, real slot promotion, and a real Library reading the
 * result.
 *
 * This is the test that would have caught every interesting bug in this
 * feature — a pack staged but never promoted, a promotion that activates a
 * hole, content changing under a running session, an old client pulling
 * something it cannot draw.
 */

import { createHash } from 'crypto';

import { activeSlot, promoteIfReady, readIndex, readPack } from '../cache';
import { Manifest, PackDescriptor, PackId, SCHEMA_VERSION } from '../contract';
import { Library } from '../library';
import { checkForUpdate } from '../updater';

const fs = require('expo-file-system');

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');

const BASE = 'https://content.test';

const lesson = (grade: number) => ({
  id: `g${grade}-l1`,
  grade,
  index: 1,
  title: 'Adding',
  icon: '➕',
  tier: 1,
  focus: ['addSub'],
  questionCount: 4,
  drawCount: 0,
});

const q = (id: string, prompt: string) => ({
  id,
  prompt,
  correctAnswer: '4',
  choices: ['3', '4', '5', '6'],
  explanation: 'because',
  answerFormat: 'integer',
  mode: 'choice',
});

const mathBody = (grade: number, version: number, prompts: string[]): string =>
  JSON.stringify({
    kind: 'math',
    schemaVersion: SCHEMA_VERSION,
    version,
    grade,
    catalog: [lesson(grade)],
    pools: { 'addSub:1': prompts.map((p, i) => q(`q${i}`, p)) },
  });

/** A stand-in content server: serves a manifest and the packs it names. */
class FakeServer {
  bodies = new Map<string, string>();
  manifest: Manifest = {
    manifestVersion: 0,
    generatedAt: '2026-08-24T00:00:00.000Z',
    minSupportedApp: '1.0.0',
    packs: [],
  };
  requests: string[] = [];
  etag = '"v0"';
  /** Set to fail the next pack download, to test partial failure. */
  failPack: string | null = null;

  /** Pack id -> the version it is on, mirroring what the real bake tracks. */
  private versions = new Map<string, { version: number; sha256: string }>();

  /**
   * Publishes a set of packs, versioning them the way `bake.ts` does: a pack
   * whose bytes have not changed keeps its version, so clients do not
   * re-download content that only happened to be republished.
   */
  publish(packs: { id: PackId; body: string; minAppVersion?: string }[], manifestVersion: number) {
    const descriptors: PackDescriptor[] = packs.map(({ id, body, minAppVersion }) => {
      const hash = sha(body);
      const url = `/packs/${id}.${hash.slice(0, 8)}.json`;
      this.bodies.set(url, body);

      const before = this.versions.get(id);
      const version = !before ? 1 : before.sha256 === hash ? before.version : before.version + 1;
      this.versions.set(id, { version, sha256: hash });

      return {
        id,
        version,
        sha256: hash,
        url,
        bytes: body.length,
        schemaVersion: SCHEMA_VERSION,
        minAppVersion: minAppVersion ?? '1.0.0',
      };
    });
    this.manifest = { ...this.manifest, manifestVersion, packs: descriptors };
    // Derived from the body, exactly as the real server does — two different
    // manifests must never share an ETag, or a client is told "unchanged"
    // about content it has never seen.
    this.etag = `"${sha(JSON.stringify(this.manifest)).slice(0, 16)}"`;
  }

  fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    this.requests.push(url);
    const path = url.replace(BASE, '').split('?')[0];

    if (path === '/v1/manifest') {
      const sent = (init?.headers as Record<string, string> | undefined)?.['If-None-Match'];
      if (sent === this.etag) {
        return new Response(null, { status: 304, headers: { etag: this.etag } });
      }
      return new Response(JSON.stringify(this.manifest), {
        status: 200,
        headers: { etag: this.etag, 'content-type': 'application/json' },
      });
    }

    if (this.failPack && path.includes(this.failPack)) {
      return new Response('gateway blew up', { status: 502 });
    }
    const body = this.bodies.get(path);
    if (body === undefined) return new Response('not found', { status: 404 });
    return new Response(body, { status: 200 });
  };
}

let server: FakeServer;

const config = (appVersion = '1.0.0') => ({
  baseUrl: BASE,
  appVersion,
  platform: 'android' as const,
});

/** A library over whichever slot is live, with no bundled fallback. */
const liveLibrary = (): Library => {
  const slot = activeSlot();
  return new Library((id) => readPack(slot, id), () => null);
};

beforeEach(() => {
  fs.__reset();
  server = new FakeServer();
  globalThis.fetch = server.fetch as unknown as typeof fetch;
});

describe('a first launch with a reachable server', () => {
  it('downloads, verifies, stages, and only shows the content after a restart', async () => {
    server.publish([{ id: 'math.g1', body: mathBody(1, 1, ['1 + 1', '2 + 2']) }], 1);

    const outcome = await checkForUpdate(config());
    expect(outcome.status).toBe('staged');
    expect(outcome.status === 'staged' && outcome.packs).toBe(1);

    // The running app is deliberately unchanged — nothing was promoted.
    expect(readPack(activeSlot(), 'math.g1')).toBeNull();

    // Restart.
    expect(promoteIfReady().promoted).toBe(true);
    const library = liveLibrary();
    expect(library.lessons(1)).toHaveLength(1);
    expect(library.lessonQuestions(lesson(1) as never, {}, Math.random).questions).toHaveLength(4);
  });
});

describe('a second launch with nothing new', () => {
  it('sends the ETag back and gets a 304 without downloading anything', async () => {
    server.publish([{ id: 'math.g1', body: mathBody(1, 1, ['1 + 1']) }], 1);
    await checkForUpdate(config());
    promoteIfReady();

    server.requests = [];
    const outcome = await checkForUpdate(config(), { force: true });

    expect(outcome.status).toBe('unchanged');
    // One conditional request, and not a single pack.
    expect(server.requests).toHaveLength(1);
    expect(server.requests[0]).toContain('/v1/manifest');
  });

  it('does not even ask again inside the throttle window', async () => {
    server.publish([{ id: 'math.g1', body: mathBody(1, 1, ['1 + 1']) }], 1);
    await checkForUpdate(config());

    server.requests = [];
    const outcome = await checkForUpdate(config());
    expect(outcome.status).toBe('throttled');
    expect(server.requests).toEqual([]);
  });
});

describe('publishing new content', () => {
  it('replaces the old questions on the next restart, not this one', async () => {
    server.publish([{ id: 'math.g1', body: mathBody(1, 1, ['old question']) }], 1);
    await checkForUpdate(config());
    promoteIfReady();

    const before = liveLibrary();
    expect(before.lessonQuestions(lesson(1) as never, {}, Math.random).questions[0].prompt)
      .toBe('old question');

    server.publish([{ id: 'math.g1', body: mathBody(1, 2, ['new question']) }], 2);
    expect((await checkForUpdate(config(), { force: true })).status).toBe('staged');

    // Still the old content: this session must not change underfoot.
    expect(before.lessonQuestions(lesson(1) as never, {}, Math.random).questions[0].prompt)
      .toBe('old question');

    // Restart.
    expect(promoteIfReady().promoted).toBe(true);
    expect(liveLibrary().lessonQuestions(lesson(1) as never, {}, Math.random).questions[0].prompt)
      .toBe('new question');
  });

  it('carries unchanged packs into the new slot so it is a complete set', async () => {
    server.publish(
      [
        { id: 'math.g1', body: mathBody(1, 1, ['g1 old']) },
        { id: 'math.g2', body: mathBody(2, 1, ['g2 stable']) },
      ],
      1,
    );
    await checkForUpdate(config());
    promoteIfReady();

    // Only grade 1 changes.
    server.publish(
      [
        { id: 'math.g1', body: mathBody(1, 2, ['g1 new']) },
        { id: 'math.g2', body: mathBody(2, 1, ['g2 stable']) },
      ],
      2,
    );
    const outcome = await checkForUpdate(config(), { force: true });
    expect(outcome.status === 'staged' && outcome.packs).toBe(1);

    promoteIfReady();
    const library = liveLibrary();
    // Both grades are present, though only one was downloaded this time.
    expect(library.lessons(1)).toHaveLength(1);
    expect(library.lessons(2)).toHaveLength(1);
  });
});

describe('when things go wrong', () => {
  it('survives the server being unreachable and keeps the content it has', async () => {
    server.publish([{ id: 'math.g1', body: mathBody(1, 1, ['still here']) }], 1);
    await checkForUpdate(config());
    promoteIfReady();

    globalThis.fetch = (async () => {
      throw new Error('ENOTFOUND');
    }) as unknown as typeof fetch;

    const outcome = await checkForUpdate(config(), { force: true });
    expect(outcome.status).toBe('failed');
    expect(liveLibrary().lessonQuestions(lesson(1) as never, {}, Math.random).questions[0].prompt)
      .toBe('still here');
  });

  it('discards a half-finished download rather than promoting part of it', async () => {
    server.publish([{ id: 'math.g1', body: mathBody(1, 1, ['first']) }], 1);
    await checkForUpdate(config());
    promoteIfReady();

    server.publish(
      [
        { id: 'math.g1', body: mathBody(1, 2, ['second']) },
        { id: 'math.g2', body: mathBody(2, 2, ['also second']) },
      ],
      2,
    );
    server.failPack = 'math.g2';

    const outcome = await checkForUpdate(config(), { force: true });
    expect(outcome.status).toBe('failed');

    // Nothing is promoted, and the old content is intact.
    expect(promoteIfReady().promoted).toBe(false);
    expect(liveLibrary().lessonQuestions(lesson(1) as never, {}, Math.random).questions[0].prompt)
      .toBe('first');
  });

  it('rejects a pack whose bytes do not match the manifest hash', async () => {
    server.publish([{ id: 'math.g1', body: mathBody(1, 1, ['honest']) }], 1);
    // A proxy mangles the body after the manifest was signed.
    const url = server.manifest.packs[0].url;
    server.bodies.set(url, mathBody(1, 1, ['tampered']));

    const outcome = await checkForUpdate(config(), { force: true });
    expect(outcome.status).toBe('failed');
    expect(outcome.status === 'failed' && outcome.reason).toContain('sha256 mismatch');
    expect(promoteIfReady().promoted).toBe(false);
  });

  it('leaves the app on bundled content when no server is configured', async () => {
    expect(await checkForUpdate({ ...config(), baseUrl: '' })).toEqual({ status: 'disabled' });
  });
});

describe('an app that has not been updated', () => {
  it('ignores content that needs a newer build and keeps what it can read', async () => {
    server.publish(
      [
        { id: 'math.g1', body: mathBody(1, 1, ['readable']) },
        { id: 'math.g2', body: mathBody(2, 1, ['needs a new app']), minAppVersion: '9.0.0' },
      ],
      1,
    );

    const outcome = await checkForUpdate(config('1.0.0'));
    expect(outcome.status === 'staged' && outcome.packs).toBe(1);

    promoteIfReady();
    const library = liveLibrary();
    expect(library.lessons(1)).toHaveLength(1);
    // The pack it could not render was never downloaded.
    expect(library.lessons(2)).toEqual([]);
    expect(readIndex(activeSlot())?.packs['math.g2']).toBeUndefined();
  });
});

/**
 * The content server is rebuilt from a clean checkout on every deploy, so it
 * has no memory of the versions it published before and starts again at 1.
 * Content the app has never seen must still reach it.
 */
describe('a server that does not remember its version numbers', () => {
  it('still delivers changed content when the version has not moved', async () => {
    server.publish([{ id: 'math.g1', body: mathBody(1, 1, ['before']) }], 1);
    await checkForUpdate(config());
    promoteIfReady();
    expect(liveLibrary().lessonQuestions(lesson(1) as never, {}, Math.random).questions[0].prompt)
      .toBe('before');

    // A fresh deploy: different content, but the counter has reset.
    const reset = new FakeServer();
    reset.publish([{ id: 'math.g1', body: mathBody(1, 1, ['after']) }], 1);
    globalThis.fetch = reset.fetch as unknown as typeof fetch;

    expect((await checkForUpdate(config(), { force: true })).status).toBe('staged');
    expect(promoteIfReady().promoted).toBe(true);
    expect(liveLibrary().lessonQuestions(lesson(1) as never, {}, Math.random).questions[0].prompt)
      .toBe('after');
  });

  it('follows a rollback to content it has already seen', async () => {
    server.publish([{ id: 'math.g1', body: mathBody(1, 1, ['good']) }], 1);
    await checkForUpdate(config());
    promoteIfReady();

    server.publish([{ id: 'math.g1', body: mathBody(1, 2, ['a bad release']) }], 2);
    await checkForUpdate(config(), { force: true });
    promoteIfReady();
    expect(liveLibrary().lessonQuestions(lesson(1) as never, {}, Math.random).questions[0].prompt)
      .toBe('a bad release');

    // Put the earlier manifest back, which is how a bad release is undone.
    const rolledBack = new FakeServer();
    rolledBack.publish([{ id: 'math.g1', body: mathBody(1, 1, ['good']) }], 1);
    globalThis.fetch = rolledBack.fetch as unknown as typeof fetch;

    expect((await checkForUpdate(config(), { force: true })).status).toBe('staged');
    expect(promoteIfReady().promoted).toBe(true);
    expect(liveLibrary().lessonQuestions(lesson(1) as never, {}, Math.random).questions[0].prompt)
      .toBe('good');
  });
});
