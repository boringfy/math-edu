const { execFileSync } = require('node:child_process');
const path = require('node:path');

it('resolves both local iOS modules into CocoaPods and the Swift module provider', () => {
  const root = path.resolve(__dirname, '../..');
  const cli = require.resolve('expo-modules-autolinking/bin/expo-modules-autolinking');
  const resolved = JSON.parse(execFileSync(process.execPath, [
    cli, 'resolve', '--platform', 'apple', '--json',
  ], { cwd: root, encoding: 'utf8' }));
  for (const [packageName, className] of [
    ['daily-reminder', 'DailyReminderModule'],
    ['icloud-store', 'ICloudStoreModule'],
  ]) {
    const module = resolved.modules.find((m) => m.packageName === packageName);
    expect(module).toBeDefined();
    expect(module.pods.length).toBeGreaterThan(0);
    expect(module.modules).toContainEqual({ name: null, class: className });
  }
});
