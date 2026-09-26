/**
 * The nine short sounds the quiz makes.
 *
 * Five for the celebrations, rising in exuberance with the tier, and four for
 * a miss. The miss sounds are deliberately the quietest things in the app:
 * warm, low, over in a fifth of a second, and never a buzzer. A wrong answer
 * from a seven-year-old should sound like "not that one", not like a klaxon.
 *
 * Every file is a plain WAV generated from sine tones rather than a sample
 * from anywhere, so there is nothing in the repo whose provenance or licence
 * has to be taken on trust, and the whole set is 144 KB.
 *
 * Nothing here is allowed to break a round. Audio is a native module, it can
 * fail to load, a device can be in a state where playback throws, and none of
 * that is worth losing a child's answer over — so every call is wrapped and
 * failures are swallowed after the first, which is logged once.
 */

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type SoundName =
  | 'sparkle'
  | 'confetti'
  | 'stars'
  | 'fireworks'
  | 'rocket'
  | 'miss-fall'
  | 'miss-boop'
  | 'miss-settle'
  | 'miss-wobble';

/** Metro needs a literal path per require, so this cannot be a loop. */
const FILES: Record<SoundName, number> = {
  sparkle: require('../../assets/sfx/sparkle.wav'),
  confetti: require('../../assets/sfx/confetti.wav'),
  stars: require('../../assets/sfx/stars.wav'),
  fireworks: require('../../assets/sfx/fireworks.wav'),
  rocket: require('../../assets/sfx/rocket.wav'),
  'miss-fall': require('../../assets/sfx/miss-fall.wav'),
  'miss-boop': require('../../assets/sfx/miss-boop.wav'),
  'miss-settle': require('../../assets/sfx/miss-settle.wav'),
  'miss-wobble': require('../../assets/sfx/miss-wobble.wav'),
};

/** Misses are quieter than praise. The difference is the point. */
const VOLUME: Partial<Record<SoundName, number>> = {
  'miss-fall': 0.5,
  'miss-boop': 0.5,
  'miss-settle': 0.5,
  'miss-wobble': 0.5,
};

const players = new Map<SoundName, AudioPlayer>();
let enabled = true;
let broken = false;

/** Turned off from settings. Silence is immediate; nothing is torn down. */
export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export const soundEnabled = (): boolean => enabled;

/**
 * Lets a quiz sound play even with the ringer off.
 *
 * A tablet handed to a child is very often on silent, and a game whose
 * feedback is silent for that reason looks broken rather than muted. Called
 * once at boot; a failure here only costs the sound.
 */
export async function prepareSound(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    /* the sounds simply obey the ringer instead */
  }
}

/**
 * Plays one, from the start.
 *
 * `seekTo(0)` first because a player that has already run sits at its end and
 * would otherwise play nothing the second time — which would mean the first
 * right answer of a round makes a sound and none of the others do.
 */
export function playSound(name: SoundName): void {
  if (!enabled || broken) return;
  try {
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(FILES[name]);
      player.volume = VOLUME[name] ?? 0.85;
      players.set(name, player);
    }
    player.seekTo(0);
    player.play();
  } catch (error) {
    // Once is enough: if the module is unavailable it will not become
    // available later in the round, and a log per answer helps nobody.
    broken = true;
    console.warn('sound unavailable, carrying on without it', error);
  }
}

/** Test hook: forgets the cached players and the broken flag. */
export function resetSound(): void {
  for (const player of players.values()) {
    try {
      player.remove();
    } catch {
      /* already gone */
    }
  }
  players.clear();
  broken = false;
  enabled = true;
}
