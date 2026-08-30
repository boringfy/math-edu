import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyUnlocks } from '../unlocks';
import { DEFAULT_SETTINGS, QuizResult } from '../../types';
import { AdaptiveState } from '../adaptive';
import {
  DeviceData,
  ProfileData,
  applyProfile,
  asDevice,
  mergeDevices,
  mergeProfiles,
  snapshotProfile,
} from '../sync';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const result = (id: string, date: string): QuizResult => ({
  id,
  date,
  subject: 'math',
  grade: 1,
  tier: 2,
  total: 5,
  correctCount: 4,
  fixedCount: 0,
  skippedCount: 0,
  elapsedMs: 60_000,
});

const adaptiveState = (over: Partial<AdaptiveState>): AdaptiveState => ({
  version: 1,
  updatedAt: '2026-08-01T00:00:00.000Z',
  rounds: 1,
  unlocked: ['addSub'],
  topics: { addSub: { window: [], streak: 0, tier: 2, unlockedAtRound: 0 } },
  hotRounds: 0,
  ...over,
});

const data = (over: Partial<ProfileData> = {}): ProfileData => ({
  grades: { math: 1, reading: 1, logic: 1 },
  tiers: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 },
  coins: 0,
  progress: { math: {}, reading: {}, logic: {} },
  history: [],
  daily: null,
  settings: DEFAULT_SETTINGS,
  adaptive: {},
  unlocks: emptyUnlocks(),
  packed: {},
  ...over,
});

const at = (updatedAt: string, d: ProfileData) => ({ updatedAt, data: d });
const atDevice = (updatedAt: string, d: DeviceData) => ({ updatedAt, data: d });

describe('mergeProfiles', () => {
  it('never loses anything a child earned', () => {
    const local = data({
      coins: 80,
      progress: {
        math: { 'g1-l1': { stars: 3, bestPercent: 100, clearedAt: '2026-08-01T00:00:00.000Z' } },
        reading: {},
        logic: {},
      },
      history: [result('a', '2026-08-02')],
    });
    const remote = data({
      coins: 120,
      progress: {
        math: {
          'g1-l1': { stars: 1, bestPercent: 60, clearedAt: '2026-07-01T00:00:00.000Z' },
          'g1-l2': { stars: 2, bestPercent: 80, clearedAt: '2026-07-02T00:00:00.000Z' },
        },
        reading: {},
        logic: {},
      },
      history: [result('b', '2026-08-03')],
    });

    const merged = mergeProfiles(at('2026-08-02', local), at('2026-08-03', remote));
    // Coins by max — never double-counted, never docked.
    expect(merged.coins).toBe(120);
    // Stars per stop by max, first clear date kept.
    expect(merged.progress.math['g1-l1']).toEqual({
      stars: 3,
      bestPercent: 100,
      clearedAt: '2026-07-01T00:00:00.000Z',
    });
    expect(merged.progress.math['g1-l2'].stars).toBe(2);
    // Histories union by id, newest first.
    expect(merged.history.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('lets the most recently changed side settle the preferences', () => {
    const local = data({ grades: { math: 3, reading: 1, logic: 1 } });
    const remote = data({ grades: { math: 4, reading: 2, logic: 1 } });
    expect(mergeProfiles(at('2026-08-05', local), at('2026-08-01', remote)).grades.math).toBe(3);
    expect(mergeProfiles(at('2026-08-01', local), at('2026-08-05', remote)).grades.math).toBe(4);
  });

  it('unions unlocked question types and keeps the fresher adaptive state', () => {
    const local = data({
      adaptive: {
        'math:1': adaptiveState({
          updatedAt: '2026-08-05T00:00:00.000Z',
          rounds: 8,
          unlocked: ['addSub', 'word'],
        }),
      },
    });
    const remote = data({
      adaptive: {
        'math:1': adaptiveState({ unlocked: ['addSub', 'geometry'] }),
        'logic:2': adaptiveState({ unlocked: ['series'] }),
      },
    });

    const merged = mergeProfiles(at('2026-08-05', local), at('2026-08-01', remote));
    expect(merged.adaptive['math:1'].rounds).toBe(8);
    expect(merged.adaptive['math:1'].unlocked.sort()).toEqual(['addSub', 'geometry', 'word']);
    // A subject+grade only one side has played comes along whole.
    expect(merged.adaptive['logic:2'].unlocked).toEqual(['series']);
  });

  it('keeps the newer day of challenges', () => {
    const local = data({
      daily: { date: '2026-08-28', challengeIds: ['a'], progress: {}, claimed: [] },
    });
    const remote = data({
      daily: { date: '2026-08-29', challengeIds: ['b'], progress: {}, claimed: [] },
    });
    expect(mergeProfiles(at('2026-08-01', local), at('2026-08-02', remote)).daily?.date).toBe(
      '2026-08-29',
    );
  });
});

describe('a device with more than one child on it', () => {
  const kids = (over: Record<string, ProfileData> = {}): DeviceData => ({
    profiles: {
      profiles: [
        { id: 'mia', name: 'Mia', avatar: '🦊', createdAt: 'x' },
        { id: 'theo', name: 'Theo', avatar: '🐼', createdAt: 'x' },
      ],
      activeId: 'mia',
    },
    kids: { mia: data({ coins: 10 }), theo: data({ coins: 20 }), ...over },
  });

  /**
   * The reason the blob had to grow. A push made while one child was playing
   * used to replace the whole backup with theirs, and the next pull would
   * find the other's year of stars gone.
   */
  it('keeps every child, not just the one playing', () => {
    const merged = mergeDevices(
      atDevice('2026-08-02', kids()),
      atDevice('2026-08-01', kids({ theo: data({ coins: 999 }) })),
    );
    expect(Object.keys(merged.kids).sort()).toEqual(['mia', 'theo']);
    expect(merged.kids.mia.coins).toBe(10);
    // Coins merge by max, the same as they always did.
    expect(merged.kids.theo.coins).toBe(999);
  });

  it('keeps a child only one device has met', () => {
    const remote = kids();
    remote.kids.ari = data({ coins: 5 });
    remote.profiles.profiles.push({ id: 'ari', name: 'Ari', avatar: '🐸', createdAt: 'x' });

    const merged = mergeDevices(atDevice('2026-08-02', kids()), atDevice('2026-08-01', remote));
    expect(merged.kids.ari.coins).toBe(5);
    expect(merged.profiles.profiles.map((p) => p.id).sort()).toEqual(['ari', 'mia', 'theo']);
  });

  /** A sync is not a hand-over: the tablet stays with whoever is holding it. */
  it('does not change whose turn it is', () => {
    const remote = kids();
    remote.profiles.activeId = 'theo';
    expect(mergeDevices(atDevice('2026-08-02', kids()), atDevice('2026-08-01', remote)).profiles.activeId).toBe(
      'mia',
    );
  });

  /** A backup written before children had profiles is still somebody's. */
  it('reads an older single-child blob as the child reading it', () => {
    const old = data({ coins: 77 });
    const asKid = asDevice(old, 'mia');
    expect(asKid.kids.mia.coins).toBe(77);
    expect(asKid.profiles.profiles).toEqual([]);
  });

  it('leaves a new-shaped blob alone', () => {
    expect(asDevice(kids(), 'mia').kids.theo.coins).toBe(20);
  });
});

describe('lessons bought', () => {
  it('are kept from both devices, because a purchase is a purchase', () => {
    const local = data({ unlocks: { math: ['g1-l2'], reading: [], logic: [] } });
    const remote = data({ unlocks: { math: ['g1-l3'], reading: ['g1-r2'], logic: [] } });
    const merged = mergeProfiles(at('2026-08-01', local), at('2026-08-02', remote));
    expect([...(merged.unlocks?.math ?? [])].sort()).toEqual(['g1-l2', 'g1-l3']);
    expect(merged.unlocks?.reading).toEqual(['g1-r2']);
  });

  /** A blob written before lessons had a price carries no purchases at all. */
  it('survives a profile from an older build', () => {
    const old = data({});
    delete (old as { unlocks?: unknown }).unlocks;
    const merged = mergeProfiles(at('2026-08-01', old), at('2026-08-02', data({})));
    expect(merged.unlocks).toBeDefined();
  });
});

describe('snapshot and apply', () => {
  beforeEach(async () => AsyncStorage.clear());

  it('round-trips the whole profile through storage', async () => {
    const original = data({
      coins: 42,
      grades: { math: 2, reading: 3, logic: 1 },
      history: [result('a', '2026-08-02')],
      adaptive: { 'math:2': adaptiveState({}) },
      progress: {
        math: { 'g2-l1': { stars: 2, bestPercent: 80, clearedAt: '2026-08-01T00:00:00.000Z' } },
        reading: {},
        logic: {},
      },
    });

    await applyProfile(original);
    const back = await snapshotProfile();
    expect(back).toEqual(original);
  });
});
