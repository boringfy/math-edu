/**
 * An in-memory filesystem, so the content cache can be tested for real
 * rather than mocked away.
 *
 * The cache is the part of the update path most likely to break in a way
 * nobody notices — a promotion that half-happens, a slot that keeps a stale
 * pack — and none of that is visible unless the tests can actually write
 * files, promote slots and read them back. So this implements enough of the
 * SDK 57 File/Directory API to do exactly that.
 */

/** Absolute path -> string contents. Directories are the keys of `dirs`. */
const files = new Map();
const dirs = new Set(['/doc', '/cache']);

const norm = (p) => p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

const join = (...parts) =>
  norm(
    parts
      .map((p) => (p && typeof p === 'object' && 'uri' in p ? p.uri : String(p)))
      .join('/'),
  );

const parentOf = (p) => norm(p.slice(0, p.lastIndexOf('/'))) || '/';

function ensureParents(p) {
  const parts = norm(p).split('/').filter(Boolean);
  let acc = '';
  for (const part of parts) {
    acc += `/${part}`;
    dirs.add(acc);
  }
}

class Directory {
  constructor(...parts) {
    this.uri = join(...parts);
  }
  get exists() {
    return dirs.has(this.uri);
  }
  create(options = {}) {
    if (this.exists && !options.idempotent && !options.overwrite) {
      throw new Error(`directory exists: ${this.uri}`);
    }
    if (!dirs.has(parentOf(this.uri)) && !options.intermediates) {
      throw new Error(`no parent directory for ${this.uri}`);
    }
    ensureParents(this.uri);
  }
  delete() {
    for (const key of [...dirs]) {
      if (key === this.uri || key.startsWith(`${this.uri}/`)) dirs.delete(key);
    }
    for (const key of [...files.keys()]) {
      if (key.startsWith(`${this.uri}/`)) files.delete(key);
    }
  }
  list() {
    const out = [];
    for (const key of files.keys()) {
      if (parentOf(key) === this.uri) out.push(new File(key));
    }
    for (const key of dirs) {
      if (key !== this.uri && parentOf(key) === this.uri) out.push(new Directory(key));
    }
    return out;
  }
  get name() {
    return this.uri.slice(this.uri.lastIndexOf('/') + 1);
  }
}

class File {
  constructor(...parts) {
    this.uri = join(...parts);
  }
  get exists() {
    return files.has(this.uri);
  }
  get name() {
    return this.uri.slice(this.uri.lastIndexOf('/') + 1);
  }
  create(options = {}) {
    if (this.exists && !options.overwrite) throw new Error(`file exists: ${this.uri}`);
    if (!dirs.has(parentOf(this.uri))) {
      if (!options.intermediates) throw new Error(`no parent directory for ${this.uri}`);
      ensureParents(parentOf(this.uri));
    }
    files.set(this.uri, '');
  }
  write(contents) {
    ensureParents(parentOf(this.uri));
    files.set(this.uri, String(contents));
  }
  textSync() {
    if (!this.exists) throw new Error(`no such file: ${this.uri}`);
    return files.get(this.uri);
  }
  async text() {
    return this.textSync();
  }
  delete() {
    files.delete(this.uri);
  }
  copy(destination, options = {}) {
    if (!this.exists) throw new Error(`no such file: ${this.uri}`);
    if (files.has(destination.uri) && !options.overwrite) {
      throw new Error(`destination exists: ${destination.uri}`);
    }
    ensureParents(parentOf(destination.uri));
    files.set(destination.uri, files.get(this.uri));
  }
  move(destination, options = {}) {
    this.copy(destination, options);
    files.delete(this.uri);
  }
}

const Paths = { document: new Directory('/doc'), cache: new Directory('/cache') };

/** Test helper: wipe everything between tests. */
function __reset() {
  files.clear();
  dirs.clear();
  dirs.add('/doc');
  dirs.add('/cache');
}

/** Test helper: see what actually ended up on disk. */
const __files = () => Object.fromEntries(files);

module.exports = { Directory, File, Paths, __reset, __files };
