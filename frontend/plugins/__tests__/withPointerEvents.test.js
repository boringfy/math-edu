const withPointerEvents = require('../withPointerEvents');

jest.mock('@expo/config-plugins', () => {
  const applied = [];
  return {
    __applied: applied,
    withMainApplication: (config, action) => {
      applied.push({ platform: 'android', action });
      return config;
    },
    withAppDelegate: (config, action) => {
      applied.push({ platform: 'ios', action });
      return config;
    },
  };
});

const plugins = require('@expo/config-plugins');

const androidSource = `import com.facebook.react.ReactPackage
class MainApplication {
  fun onCreate() {
    super.onCreate()
  }
}`;
const iosSource = `import React
class AppDelegate {
  func application() {
    let delegate = ReactNativeDelegate()
  }
}`;

function applyTwice(platform, language, source) {
  const action = plugins.__applied.find((entry) => entry.platform === platform).action;
  const first = action({ modResults: { language, contents: source } }).modResults.contents;
  const second = action({ modResults: { language, contents: first } }).modResults.contents;
  expect(second).toBe(first);
  return first;
}

it('enables pointer events before the native touch handlers on both platforms', () => {
  plugins.__applied.length = 0;
  withPointerEvents({ name: 'Have Fun Learning' });

  const android = applyTwice('android', 'kt', androidSource);
  expect(android).toContain('ReactFeatureFlags.dispatchPointerEvents = true');

  const ios = applyTwice('ios', 'swift', iosSource);
  expect(ios).toContain('RCTSetDispatchW3CPointerEvents(true)');
  expect(ios.indexOf('RCTSetDispatchW3CPointerEvents(true)'))
    .toBeLessThan(ios.indexOf('let delegate = ReactNativeDelegate()'));
});
