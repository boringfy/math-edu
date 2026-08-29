/**
 * Stands in for the speech synthesiser, which has no voice off-device.
 *
 * Being adjacent to node_modules, jest picks this up automatically. Speaking
 * does nothing rather than completing instantly — a mock that fired onDone
 * synchronously would race a component through its whole lesson mid-render.
 * A test that wants to advance the lesson calls `__finishSpeaking()`.
 */
let lastOptions = null;

module.exports = {
  speak: jest.fn((text, options) => {
    lastOptions = options ?? null;
  }),
  stop: jest.fn(() => {
    lastOptions = null;
  }),
  isSpeakingAsync: jest.fn(async () => false),
  maxSpeechInputLength: 4000,

  /** Test helpers, prefixed so they can't be mistaken for real API. */
  __finishSpeaking: () => {
    const done = lastOptions && lastOptions.onDone;
    lastOptions = null;
    if (done) done();
  },
  __reset: () => {
    lastOptions = null;
    module.exports.speak.mockClear();
    module.exports.stop.mockClear();
  },
};
