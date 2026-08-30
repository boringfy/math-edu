/**
 * Two children, one tablet.
 *
 * The migration is the part worth being careful about. There is a real device
 * with a real child two hundred lessons in, and the first launch after this
 * ships has to carry all of it across without being asked to. Everything else
 * here is bookkeeping; that one is somebody's year of stars.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  AVATARS,
  MAX_PROFILES,
  addProfile,
  activeProfile,
  canAddProfile,
  cleanName,
  emptyProfiles,
  makeProfile,
  removeProfile,
  renameProfile,
  settle,
  switchTo,
} from '../profiles';
import {
  forgetProfile,
  loadCoins,
  loadProfiles,
  loadProgress,
  migrateToProfiles,
  saveCoins,
  saveProfiles,
  saveProgress,
  useProfile,
} from '../storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  useProfile('');
});

describe('naming a child', () => {
  it('tidies what was typed', () => {
    expect(cleanName('  Mia  ')).toBe('Mia');
    expect(cleanName('a   b')).toBe('a b');
  });

  it('never ends up with a nameless button', () => {
    expect(cleanName('')).toBe('Player');
    expect(cleanName('   ')).toBe('Player');
  });

  it('keeps a name short enough for the pill it sits in', () => {
    expect(cleanName('Bartholomew Archibald').length).toBeLessThanOrEqual(12);
  });
});

describe('the list of children', () => {
  const store = () => {
    let s = emptyProfiles();
    s = addProfile(s, makeProfile('Mia', s.profiles));
    s = addProfile(s, makeProfile('Theo', s.profiles));
    return s;
  };

  it('makes the newest child the one playing', () => {
    const s = store();
    expect(activeProfile(s)?.name).toBe('Theo');
  });

  it('gives each child a different face', () => {
    const s = store();
    expect(s.profiles[0].avatar).not.toBe(s.profiles[1].avatar);
  });

  it('gives each child an id of their own', () => {
    const s = store();
    expect(s.profiles[0].id).not.toBe(s.profiles[1].id);
  });

  it('stops at a screenful', () => {
    let s = emptyProfiles();
    for (let i = 0; i < MAX_PROFILES + 3; i++) s = addProfile(s, makeProfile(`Kid ${i}`, s.profiles));
    expect(s.profiles).toHaveLength(MAX_PROFILES);
    expect(canAddProfile(s)).toBe(false);
  });

  it('runs out of distinct faces gracefully', () => {
    let s = emptyProfiles();
    for (let i = 0; i < MAX_PROFILES; i++) s = addProfile(s, makeProfile(`Kid ${i}`, s.profiles));
    expect(s.profiles.every((p) => AVATARS.includes(p.avatar))).toBe(true);
  });

  it('switches only to a child who exists', () => {
    const s = store();
    expect(switchTo(s, s.profiles[0].id).activeId).toBe(s.profiles[0].id);
    expect(switchTo(s, 'nobody').activeId).toBe(s.activeId);
  });

  it('renames without disturbing anything else', () => {
    const s = store();
    const renamed = renameProfile(s, s.profiles[0].id, 'Mimi');
    expect(renamed.profiles[0].name).toBe('Mimi');
    expect(renamed.profiles[0].id).toBe(s.profiles[0].id);
    expect(renamed.activeId).toBe(s.activeId);
  });

  it('hands the turn on when the child playing is removed', () => {
    const s = store();
    const left = removeProfile(s, s.activeId);
    expect(left.profiles).toHaveLength(1);
    expect(left.activeId).toBe(left.profiles[0].id);
  });

  /** With nobody left, the next launch would mint a stranger. */
  it('refuses to remove the last child', () => {
    let s = emptyProfiles();
    s = addProfile(s, makeProfile('Only', s.profiles));
    expect(removeProfile(s, s.activeId)).toBe(s);
  });
});

describe('a store read off a damaged disk', () => {
  it('lands on somebody real when the active id points nowhere', () => {
    const mia = makeProfile('Mia');
    expect(settle({ profiles: [mia], activeId: 'gone' }).activeId).toBe(mia.id);
  });

  it('drops entries that are not children', () => {
    const mia = makeProfile('Mia');
    const broken = { profiles: [mia, { id: '', name: '', avatar: '' }], activeId: mia.id };
    expect(settle(broken as never).profiles).toHaveLength(1);
  });

  it('comes back empty rather than half-real', () => {
    expect(settle(emptyProfiles())).toEqual(emptyProfiles());
  });
});

describe('keeping two children apart', () => {
  it('stores their progress under different keys', async () => {
    useProfile('kid-a');
    await saveCoins(100);
    await saveProgress('math', 'g1-l1', { stars: 3, bestPercent: 100, clearedAt: 'x' });

    useProfile('kid-b');
    expect(await loadCoins()).toBe(0);
    expect(await loadProgress('math')).toEqual({});

    await saveCoins(7);
    useProfile('kid-a');
    expect(await loadCoins()).toBe(100);
    expect((await loadProgress('math'))['g1-l1'].stars).toBe(3);
  });

  it('forgets one child without touching the other', async () => {
    useProfile('kid-a');
    await saveCoins(100);
    useProfile('kid-b');
    await saveCoins(50);

    await forgetProfile('kid-a');
    expect(await loadCoins()).toBe(50);
    useProfile('kid-a');
    expect(await loadCoins()).toBe(0);
  });
});

describe('the first launch after profiles arrive', () => {
  /** A device already in use, with a year of progress on the old keys. */
  const asItWasBefore = async () => {
    useProfile('');
    await saveCoins(5574);
    await saveProgress('math', 'g2-l58', { stars: 2, bestPercent: 85, clearedAt: '2026-08-01' });
    await saveProgress('reading', 'g2-r10', { stars: 3, bestPercent: 100, clearedAt: '2026-08-01' });
  };

  it('carries everything across to the first child', async () => {
    await asItWasBefore();
    const store = await migrateToProfiles('Mia');

    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0].name).toBe('Mia');

    useProfile(store.activeId);
    expect(await loadCoins()).toBe(5574);
    expect((await loadProgress('math'))['g2-l58'].stars).toBe(2);
    expect((await loadProgress('reading'))['g2-r10'].stars).toBe(3);
  });

  /** Rolling the build back must still find the child's progress. */
  it('leaves the old keys where they were', async () => {
    await asItWasBefore();
    await migrateToProfiles();
    useProfile('');
    expect(await loadCoins()).toBe(5574);
  });

  it('does nothing on a device that already has profiles', async () => {
    await asItWasBefore();
    const first = await migrateToProfiles('Mia');
    useProfile(first.activeId);
    await saveCoins(1);

    const again = await migrateToProfiles('Someone Else');
    expect(again.profiles).toHaveLength(1);
    expect(again.profiles[0].name).toBe('Mia');
    useProfile(again.activeId);
    expect(await loadCoins()).toBe(1);
  });

  it('is fine on a device with nothing on it at all', async () => {
    const store = await migrateToProfiles('Mia');
    expect(store.profiles).toHaveLength(1);
    useProfile(store.activeId);
    expect(await loadCoins()).toBe(0);
  });

  it('survives being read back off disk', async () => {
    await asItWasBefore();
    const store = await migrateToProfiles('Mia');
    const reloaded = await loadProfiles();
    expect(reloaded.activeId).toBe(store.activeId);
    expect(reloaded.profiles[0].name).toBe('Mia');
  });

  it('repairs a stored store whose active child has gone', async () => {
    const mia = makeProfile('Mia');
    await saveProfiles({ profiles: [mia], activeId: 'someone-deleted' });
    expect((await loadProfiles()).activeId).toBe(mia.id);
  });
});
