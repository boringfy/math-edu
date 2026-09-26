jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-crypto', () => ({ randomUUID: () => '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }));

const usage = () => require('../usage') as typeof import('../usage');
const storage = () => {
  const module = require('@react-native-async-storage/async-storage');
  return (module.default ?? module) as typeof import('@react-native-async-storage/async-storage').default;
};

beforeEach(async () => {
  jest.resetModules();
  await storage().clear();
  global.fetch = jest.fn(async () => ({ status: 202 })) as unknown as typeof fetch;
});

it('does not create an identifier or send anything before first-launch consent', async () => {
  const { loadUsageConsent, recordUsage } = usage();
  expect(await loadUsageConsent()).toBeNull();
  await recordUsage('app_opened');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(await storage().getAllKeys()).toEqual([]);
});

it('sends only the approved counts to the first-party endpoint', async () => {
  const { recordUsage, setUsageConsent } = usage();
  await setUsageConsent(true);
  await recordUsage('lesson_completed', { subject: 'math' });

  const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
  const body = JSON.parse(init.body as string);
  expect(url).toBe('https://hashfront.com/api/usage');
  expect(body).toMatchObject({
    app: 'math-edu',
    installId: expect.any(String),
    events: [{ name: 'lesson_completed', props: { subject: 'math' } }],
  });
  expect(body.events[0].props).toEqual({ subject: 'math' });
  expect(body).not.toHaveProperty('profileId');
  expect(body).not.toHaveProperty('deviceId');
});

it('keeps failed uploads locally and retries on resume', async () => {
  const { flushUsage, recordUsage, setUsageConsent } = usage();
  await setUsageConsent(true);
  global.fetch = jest.fn(async () => ({ status: 503 })) as unknown as typeof fetch;
  await recordUsage('app_opened');
  expect(await storage().getItem('mathquiz:usageQueue')).toContain('app_opened');

  global.fetch = jest.fn(async () => ({ status: 202 })) as unknown as typeof fetch;
  await flushUsage();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(await storage().getItem('mathquiz:usageQueue')).toBeNull();
});

it('stops and deletes the queued events and tracking ID when disabled', async () => {
  const { recordUsage, setUsageConsent } = usage();
  await setUsageConsent(true);
  global.fetch = jest.fn(async () => ({ status: 503 })) as unknown as typeof fetch;
  await recordUsage('app_opened');
  expect(await storage().getItem('mathquiz:usageInstallId')).not.toBeNull();

  await setUsageConsent(false);
  await recordUsage('lesson_completed', { subject: 'reading' });
  expect(await storage().getItem('mathquiz:usageInstallId')).toBeNull();
  expect(await storage().getItem('mathquiz:usageQueue')).toBeNull();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
