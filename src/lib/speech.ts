/**
 * The one place that talks to the speech recogniser.
 *
 * The rule this module exists to enforce: **a child's voice never leaves the
 * tablet**. Android's default recogniser will happily stream audio to Google's
 * servers, so every path here either uses on-device recognition or reports
 * that the feature is unavailable. There is deliberately no fallback.
 */
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/** Re-exported so the recogniser is reached through this module alone. */
export { useSpeechRecognitionEvent } from 'expo-speech-recognition';

/** The language the stories are written in. */
export const READING_LOCALE = 'en-US';

/**
 * Android System Intelligence, which is the package that actually holds the
 * downloaded offline models. Asking any other service which locales are
 * installed comes back empty.
 */
const OFFLINE_MODEL_PACKAGE = 'com.google.android.as';

/**
 * Whether to offer reading out loud at all.
 *
 * Both checks matter: the first says a recogniser exists, the second says it
 * can run without a network. If either is false the feature hides itself
 * rather than quietly falling back to cloud recognition.
 */
export function readAloudAvailable(): boolean {
  try {
    return (
      ExpoSpeechRecognitionModule.isRecognitionAvailable() &&
      ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()
    );
  } catch {
    // A device without the native module at all.
    return false;
  }
}

/** Asks for the microphone. Returns whether we may listen. */
export async function requestMicrophone(): Promise<boolean> {
  try {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

export type ModelState = 'ready' | 'downloading' | 'unavailable';

/**
 * Makes sure the offline English model is on the device.
 *
 * Recognition cannot run locally without it, and the download is a system
 * dialog we can only ask for — hence `downloading` as a distinct answer, so
 * the screen can tell the child to try again in a moment rather than showing
 * a failure.
 */
export async function ensureOfflineModel(): Promise<ModelState> {
  try {
    const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({
      androidRecognitionServicePackage: OFFLINE_MODEL_PACKAGE,
    });
    // Any English will do — a child reading "cat" is not tripped up by en-GB
    // against en-US.
    if (installedLocales.some((locale) => locale.toLowerCase().startsWith('en'))) return 'ready';

    await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
      locale: READING_LOCALE,
    });
    return 'downloading';
  } catch {
    return 'unavailable';
  }
}

/**
 * Starts listening, on-device only.
 *
 * `bias` is the story's own vocabulary, which the recogniser is told to
 * expect — it is guessing at a child's voice, and knowing roughly which words
 * are coming makes it markedly better at it.
 */
export function startListening(bias: string[] = []): void {
  ExpoSpeechRecognitionModule.start({
    lang: READING_LOCALE,
    contextualStrings: bias,
    // Words are matched as they arrive, so the passage lights up while the
    // child is still reading rather than all at once at the end.
    interimResults: true,
    // A whole paragraph is far longer than one recognition turn.
    continuous: true,
    // The point of the whole module.
    requiresOnDeviceRecognition: true,
    // Reading aloud is not a conversation; there is nothing to filter.
    addsPunctuation: false,
  });
}

export function stopListening(): void {
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch {
    // Already stopped, or never started.
  }
}
