const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { X509Certificate } = require('node:crypto');

const root = join(__dirname, '..', '..');
const config = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;

describe('self-hosted updates for both store binaries', () => {
  it('uses the lesson backend host but a separate update route', () => {
    expect(config.updates.url).toBe('https://math-edu.hashfront.com/v1/app-updates/manifest');
    expect(config.runtimeVersion).toEqual({ policy: 'appVersion' });
    expect(config.updates.requestHeaders).toEqual({ 'expo-channel-name': 'production' });
    expect(config.ios.bundleIdentifier).toBe('com.hashfront.mathedu');
    expect(config.ios.appleTeamId).toBe('FNK34ANN2H');
    expect(config.android.package).toBe('com.hashfront.mathedu');
  });

  it('bundles a public signing certificate, never a private key', () => {
    const pem = readFileSync(join(root, config.updates.codeSigningCertificate), 'utf8');
    expect(pem).toContain('BEGIN CERTIFICATE');
    expect(pem).not.toContain('PRIVATE KEY');
    expect(() => new X509Certificate(pem)).not.toThrow();
    expect(config.updates.codeSigningMetadata).toEqual({ keyid: 'main', alg: 'rsa-v1_5-sha256' });
  });
});
