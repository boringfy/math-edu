/**
 * Expo's standard Babel setup, stated explicitly.
 *
 * Metro infers this preset even with no config file, and the plain
 * `jest-expo` preset injects it too — but the per-platform presets
 * (`jest-expo/ios`, `jest-expo/android`), which is how the test suite runs
 * the UI twice over, do not. Without this file they hand raw TypeScript to a
 * bare Babel and fail to parse React Native itself.
 */

module.exports = function babel(api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
