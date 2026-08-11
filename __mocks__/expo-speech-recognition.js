/**
 * Stands in for the speech recogniser, which has no meaning off-device.
 *
 * Being adjacent to node_modules, jest picks this up automatically, so the
 * rest of the suite carries on unaware that a microphone was ever involved.
 * It reports the feature as unavailable by default, which is what an emulator
 * or a plain phone would say; a test that wants the listening UI turns it on
 * with `__setAvailable(true)` and then plays the recogniser itself.
 */
let available = false;
const handlers = new Map();

const ExpoSpeechRecognitionModule = {
  isRecognitionAvailable: () => available,
  supportsOnDeviceRecognition: () => available,
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getSupportedLocales: jest.fn(async () => ({
    locales: ['en-US'],
    installedLocales: ['en-US'],
  })),
  androidTriggerOfflineModelDownload: jest.fn(async () => ({
    status: 'download_success',
    message: '',
  })),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
};

module.exports = {
  ExpoSpeechRecognitionModule,

  /** The real one is a hook; re-registering each render is harmless here. */
  useSpeechRecognitionEvent: (name, handler) => {
    handlers.set(name, handler);
  },

  /** Test helpers, all prefixed so they can't be mistaken for real API. */
  __setAvailable: (value) => {
    available = value;
  },
  __emit: (name, event) => {
    const handler = handlers.get(name);
    if (handler) handler(event);
  },
  __reset: () => {
    available = false;
    handlers.clear();
    ExpoSpeechRecognitionModule.start.mockClear();
    ExpoSpeechRecognitionModule.stop.mockClear();
    ExpoSpeechRecognitionModule.requestPermissionsAsync.mockClear();
    ExpoSpeechRecognitionModule.getSupportedLocales.mockClear();
    ExpoSpeechRecognitionModule.getSupportedLocales.mockImplementation(async () => ({
      locales: ['en-US'],
      installedLocales: ['en-US'],
    }));
    ExpoSpeechRecognitionModule.requestPermissionsAsync.mockImplementation(async () => ({
      granted: true,
    }));
  },
};
