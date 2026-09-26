/** The JS boundary must fail safely when optional native modules are absent or throw. */
type Reminder = typeof import('../../../modules/daily-reminder');
type ICloud = typeof import('../../../modules/icloud-store');

function loadNative<T>(moduleName: string, native: unknown, path: string): T {
  let loaded!: T;
  jest.isolateModules(() => {
    jest.doMock('expo-modules-core', () => ({
      requireOptionalNativeModule: (name: string) => name === moduleName ? native : null,
    }));
    loaded = require(path) as T;
  });
  return loaded;
}

afterEach(() => jest.dontMock('expo-modules-core'));

describe('daily reminder native boundary', () => {
  const load = (native: unknown) =>
    loadNative<Reminder>('DailyReminder', native, '../../../modules/daily-reminder');

  it('does not schedule or cancel when notifications are unavailable', async () => {
    const reminder = load(null);
    expect(await reminder.scheduleDailyReminder(17, 30)).toBe(false);
    expect(reminder.cancelDailyReminder()).toBe(false);
  });

  it('requests permission before scheduling the exact time', async () => {
    const native = {
      requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
      schedule: jest.fn(async () => true),
      cancel: jest.fn(() => true),
    };
    const reminder = load(native);
    expect(await reminder.scheduleDailyReminder(7, 45)).toBe(true);
    expect(native.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(native.schedule).toHaveBeenCalledWith(7, 45);
    expect(reminder.cancelDailyReminder()).toBe(true);
  });

  it('accepts a granted status but never schedules after denial', async () => {
    const native = {
      requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
      schedule: jest.fn(() => true),
      cancel: jest.fn(() => false),
    };
    const reminder = load(native);
    expect(await reminder.scheduleDailyReminder(18, 0)).toBe(true);
    native.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    expect(await reminder.scheduleDailyReminder(18, 0)).toBe(false);
    expect(native.schedule).toHaveBeenCalledTimes(1);
  });

  it('contains permission, schedule, and cancellation errors', async () => {
    const native = {
      requestPermissionsAsync: jest.fn(async (): Promise<{ granted: boolean }> => { throw new Error('permission'); }),
      schedule: jest.fn(() => { throw new Error('schedule'); }),
      cancel: jest.fn(() => { throw new Error('cancel'); }),
    };
    const reminder = load(native);
    expect(await reminder.scheduleDailyReminder(9, 0)).toBe(false);
    native.requestPermissionsAsync.mockImplementation(async () => ({ granted: true }));
    expect(await reminder.scheduleDailyReminder(9, 0)).toBe(false);
    expect(reminder.cancelDailyReminder()).toBe(false);
  });
});

describe('iCloud storage native boundary', () => {
  const load = (native: unknown) =>
    loadNative<ICloud>('ICloudStore', native, '../../../modules/icloud-store');

  it('returns safe defaults when iCloud is unavailable (including Android)', () => {
    const cloud = load(null);
    expect(cloud.iCloudAvailable()).toBe(false);
    expect(cloud.readICloudValue('progress')).toBeNull();
    expect(cloud.writeICloudValue('progress', '{}')).toBe(false);
  });

  it('synchronizes before reading and forwards writes', () => {
    const calls: string[] = [];
    const native = {
      isAvailable: jest.fn(() => true),
      synchronize: jest.fn(() => { calls.push('sync'); return true; }),
      getString: jest.fn((key: string) => { calls.push(key); return 'saved'; }),
      setString: jest.fn(() => true),
    };
    const cloud = load(native);
    expect(cloud.iCloudAvailable()).toBe(true);
    expect(cloud.readICloudValue('progress')).toBe('saved');
    expect(calls).toEqual(['sync', 'progress']);
    expect(cloud.writeICloudValue('progress', '{}')).toBe(true);
    expect(native.setString).toHaveBeenCalledWith('progress', '{}');
  });

  it('contains native read and write failures', () => {
    const native = {
      isAvailable: () => { throw new Error('availability'); },
      synchronize: () => { throw new Error('sync'); },
      getString: () => 'unreachable',
      setString: () => { throw new Error('write'); },
    };
    const cloud = load(native);
    expect(cloud.iCloudAvailable()).toBe(false);
    expect(cloud.readICloudValue('progress')).toBeNull();
    expect(cloud.writeICloudValue('progress', '{}')).toBe(false);
  });
});
