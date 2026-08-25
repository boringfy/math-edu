/**
 * A real SHA-256, not a stub.
 *
 * The cache refuses any pack whose hash does not match the manifest, and a
 * fake digest would make that check pass for anything — including the
 * truncated-download case the check exists to catch. Node has the real
 * thing, so the tests use it.
 */

const { createHash } = require('crypto');

const CryptoDigestAlgorithm = { SHA256: 'SHA-256', SHA1: 'SHA-1', SHA512: 'SHA-512' };

const NODE_NAME = { 'SHA-256': 'sha256', 'SHA-1': 'sha1', 'SHA-512': 'sha512' };

async function digestStringAsync(algorithm, data) {
  return createHash(NODE_NAME[algorithm] ?? 'sha256').update(data, 'utf8').digest('hex');
}

module.exports = { CryptoDigestAlgorithm, digestStringAsync };
