/**
 * The sound bank.
 *
 * Audio is a native module that can be missing, broken, or refuse to play on
 * a given device. None of that is worth losing a child's answer over, so what
 * is pinned here is mostly what happens when it goes wrong.
 */

interface FakePlayer {
  play: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
  volume: number;
}

const mockPlay = jest.fn();
const mockSeekTo = jest.fn();
const mockRemove = jest.fn();
/** Every player handed out, so a test can read the volume that was set. */
const mockMade: FakePlayer[] = [];
const mockCreate = jest.fn((): FakePlayer => {
  const player: FakePlayer = {
    play: mockPlay,
    seekTo: mockSeekTo,
    remove: mockRemove,
    volume: 1,
  };
  mockMade.push(player);
  return player;
});

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreate(...(args as [])),
  setAudioModeAsync: jest.fn(async () => undefined),
}));

import { playSound, prepareSound, resetSound, setSoundEnabled, soundEnabled } from '../sfx';

beforeEach(() => {
  jest.clearAllMocks();
  mockMade.length = 0;
  mockCreate.mockImplementation((): FakePlayer => {
    const player: FakePlayer = {
      play: mockPlay,
      seekTo: mockSeekTo,
      remove: mockRemove,
      volume: 1,
    };
    mockMade.push(player);
    return player;
  });
  resetSound();
});

describe('playing', () => {
  it('creates a player once and reuses it', () => {
    playSound('confetti');
    playSound('confetti');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  /** Without this the second right answer of a round would be silent. */
  it('rewinds before every play', () => {
    playSound('stars');
    playSound('stars');
    expect(mockSeekTo).toHaveBeenCalledTimes(2);
    expect(mockSeekTo).toHaveBeenCalledWith(0);
  });

  it('keeps a separate player per sound', () => {
    playSound('sparkle');
    playSound('miss-boop');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  /** A wrong answer must never be the loudest thing in the room. */
  it('plays misses more quietly than praise', () => {
    playSound('fireworks');
    playSound('miss-fall');
    const [praise, miss] = mockMade;
    expect(miss.volume).toBeLessThan(praise.volume);
  });
});

describe('the switch', () => {
  it('is on to begin with', () => {
    expect(soundEnabled()).toBe(true);
  });

  it('plays nothing at all when turned off', () => {
    setSoundEnabled(false);
    playSound('rocket');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('comes back on', () => {
    setSoundEnabled(false);
    setSoundEnabled(true);
    playSound('rocket');
    expect(mockPlay).toHaveBeenCalled();
  });
});

describe('when audio is broken', () => {
  it('swallows the failure rather than throwing into the quiz', () => {
    mockCreate.mockImplementation(() => {
      throw new Error('no audio on this device');
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => playSound('confetti')).not.toThrow();
  });

  it('complains once, not once per answer', () => {
    mockCreate.mockImplementation(() => {
      throw new Error('no audio on this device');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    for (let i = 0; i < 10; i++) playSound('confetti');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stops trying after the first failure', () => {
    mockCreate.mockImplementation(() => {
      throw new Error('no audio');
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    playSound('confetti');
    playSound('stars');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('preparing', () => {
  it('asks to be heard through the silent switch', async () => {
    const { setAudioModeAsync } = require('expo-audio');
    await prepareSound();
    expect(setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: true });
  });

  it('survives that being refused', async () => {
    const { setAudioModeAsync } = require('expo-audio');
    setAudioModeAsync.mockRejectedValueOnce(new Error('nope'));
    await expect(prepareSound()).resolves.toBeUndefined();
  });
});
