/**
 * The one place that talks out loud.
 *
 * Text-to-speech is `expo-speech`, which stays on the device — nothing a
 * child hears has been sent anywhere to be synthesised. This wrapper exists
 * so the tutor never touches the module directly, and so there is exactly
 * one opinion about how the tutor's voice sounds.
 */
import * as Speech from 'expo-speech';

/** Every step ends here, spoken or not, which is what step-chaining hangs on. */
export function speakStep(text: string, onDone: () => void): void {
  Speech.speak(text, {
    language: 'en-US',
    // A touch slower than an adult listener would want: the listener is
    // seven and hearing the idea for the first time.
    rate: 0.92,
    pitch: 1.05,
    onDone,
    // A device with a broken voice must not silently freeze the lesson on
    // step one — the steps still appear, just unvoiced.
    onError: onDone,
  });
}

/** Cuts the voice off mid-word. For closing the lesson; never an error. */
export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // Already quiet.
  }
}
