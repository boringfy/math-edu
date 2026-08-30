/**
 * The one piece of code that has to know both platforms' security models.
 *
 * A wrong answer here is invisible until it is expensive: the app builds, it
 * installs, and every content check fails silently against a plain-HTTP
 * server — which looks exactly like the server being down. Android blocks
 * cleartext by default from Android 9, iOS blocks it through App Transport
 * Security, and the exemption has to be narrow on both.
 *
 * These run in the `plugins` project, in plain Node: config plugins are
 * build-time code and never reach a device.
 */

const withContentCleartext = require('../withContentCleartext');

/**
 * Runs the plugin the way `expo prebuild` does, collecting what it would have
 * written. The real mods are async callbacks keyed by platform, so this fakes
 * just enough of @expo/config-plugins to drive them.
 */
jest.mock('@expo/config-plugins', () => {
  const applied = [];
  return {
    __applied: applied,
    withAndroidManifest: (config, action) => {
      applied.push({ mod: 'androidManifest', action });
      return config;
    },
    withInfoPlist: (config, action) => {
      applied.push({ mod: 'infoPlist', action });
      return config;
    },
    withDangerousMod: (config, [platform, action]) => {
      applied.push({ mod: `dangerous:${platform}`, action });
      return config;
    },
    AndroidConfig: {
      Manifest: {
        getMainApplicationOrThrow: (manifest) => manifest.manifest.application[0],
      },
    },
  };
});

const plugins = require('@expo/config-plugins');

/** A bare app config, plus somewhere for each mod to write its results. */
const baseConfig = () => ({ name: 'Boring Quest', slug: 'math-edu' });

const androidManifest = () => ({
  manifest: { application: [{ $: { 'android:name': '.MainApplication' } }] },
});

/** Runs the plugin and returns what each platform's mod produced. */
async function run(contentUrl) {
  plugins.__applied.length = 0;
  const saved = process.env.EXPO_PUBLIC_CONTENT_URL;
  if (contentUrl === undefined) delete process.env.EXPO_PUBLIC_CONTENT_URL;
  else process.env.EXPO_PUBLIC_CONTENT_URL = contentUrl;

  try {
    withContentCleartext(baseConfig());
  } finally {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_CONTENT_URL;
    else process.env.EXPO_PUBLIC_CONTENT_URL = saved;
  }

  const mods = plugins.__applied;
  const result = { mods: mods.map((m) => m.mod), infoPlist: null, manifest: null };

  const plist = mods.find((m) => m.mod === 'infoPlist');
  if (plist) {
    const config = { modResults: {} };
    await plist.action(config);
    result.infoPlist = config.modResults;
  }

  const manifest = mods.find((m) => m.mod === 'androidManifest');
  if (manifest) {
    const config = { modResults: androidManifest() };
    await manifest.action(config);
    result.manifest = config.modResults.manifest.application[0].$;
  }

  return result;
}

describe('a named host over plain http', () => {
  it('permits cleartext for that host on iOS, and nothing wider', async () => {
    const { infoPlist } = await run('http://content.example.com:8788');
    const ats = infoPlist.NSAppTransportSecurity;

    expect(ats.NSExceptionDomains['content.example.com']).toEqual({
      NSExceptionAllowsInsecureHTTPLoads: true,
      NSIncludesSubdomains: false,
    });
    // The blunt instruments stay untouched: one host, not the whole internet.
    expect(ats.NSAllowsArbitraryLoads).toBeUndefined();
  });

  it('points the Android manifest at the generated network security config', async () => {
    const { manifest } = await run('http://content.example.com:8788');
    expect(manifest['android:networkSecurityConfig']).toBe('@xml/content_cleartext');
  });

  it('writes the rule for both platforms in one pass', async () => {
    const { mods } = await run('http://content.example.com:8788');
    expect(mods).toContain('infoPlist');
    expect(mods).toContain('androidManifest');
    expect(mods).toContain('dangerous:android');
  });
});

describe('a bare IP address over plain http', () => {
  it('falls back to allowing local networking, which is all ATS can scope to', async () => {
    // An ATS exception domain cannot be an IP literal, so a home-network
    // server has to be permitted the only way iOS allows.
    const { infoPlist } = await run('http://192.168.0.151:8788');
    const ats = infoPlist.NSAppTransportSecurity;

    expect(ats.NSAllowsLocalNetworking).toBe(true);
    expect(ats.NSAllowsArbitraryLoads).toBe(true);
    expect(ats.NSExceptionDomains).toBeUndefined();
  });

  it('still scopes Android to the one host', async () => {
    const { manifest } = await run('http://192.168.0.151:8788');
    expect(manifest['android:networkSecurityConfig']).toBe('@xml/content_cleartext');
  });
});

describe('when no exemption is needed', () => {
  it('leaves an https server alone on both platforms', async () => {
    const { mods } = await run('https://content.example.com');
    expect(mods).toEqual([]);
  });

  it('leaves an offline build alone on both platforms', async () => {
    const { mods } = await run(undefined);
    expect(mods).toEqual([]);
  });

  it('refuses to build on a malformed URL rather than failing silently later', () => {
    process.env.EXPO_PUBLIC_CONTENT_URL = 'not a url';
    try {
      expect(() => withContentCleartext(baseConfig())).toThrow(/not a valid URL/);
    } finally {
      delete process.env.EXPO_PUBLIC_CONTENT_URL;
    }
  });
});
