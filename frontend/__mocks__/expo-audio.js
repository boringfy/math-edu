/**
 * A stand-in for the audio native module.
 *
 * `expo-audio` reaches for a native player class at import time, so merely
 * importing `src/lib/sfx.ts` blows up under the test runner — which took out
 * every suite that renders a quiz, not only the ones about sound.
 *
 * Jest applies a `__mocks__` file for a node_modules package automatically,
 * with no `jest.mock` call in each suite, which is what makes this the right
 * place for it: a test that does not care about audio should not have to know
 * audio exists. A suite that does care mocks `src/lib/sfx` itself and never
 * reaches this.
 */

const player = () => ({
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(),
  remove: jest.fn(),
  volume: 1,
});

module.exports = {
  createAudioPlayer: jest.fn(player),
  useAudioPlayer: jest.fn(player),
  setAudioModeAsync: jest.fn(async () => undefined),
};
