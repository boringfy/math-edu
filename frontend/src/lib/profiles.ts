/**
 * Who is playing.
 *
 * A tablet in a house with two children is one tablet with two children's
 * progress on it, and until now it only had room for one. So everything a
 * child earns — stars, coins, the lessons they have bought, what the adaptive
 * engine has learned about them — is stored under a profile id, and switching
 * profile swaps the lot.
 *
 * There is no login and no password. These are children, the device is
 * already in their hands, and a lock would only ever lock out the person it
 * was meant to help. Picking a name off a list is the whole of it.
 *
 * What is *not* per child: the content cache, the sync identity, and the
 * grown-up settings. Those belong to the device, and duplicating them per
 * child would mean downloading the same packs twice.
 */

/** A child. `id` is minted once and never reused, because it keys their data. */
export interface Profile {
  id: string;
  name: string;
  avatar: string;
  createdAt: string;
}

export interface ProfileStore {
  profiles: Profile[];
  /** Whose turn it is. Always one of `profiles`, or the list is empty. */
  activeId: string;
}

/**
 * Enough for a family, few enough to fit on one screen without scrolling —
 * which matters, because a child picking their face out of a list is the
 * entire sign-in.
 */
export const MAX_PROFILES = 6;

/** Chosen for being tellable apart at a glance by someone who cannot read. */
export const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐧', '🦄', '🐢', '🐝'];

export const emptyProfiles = (): ProfileStore => ({ profiles: [], activeId: '' });

/**
 * A fresh id. Time plus a little randomness: two children made in the same
 * millisecond on two devices would otherwise share a name for their progress.
 */
const mintId = (random: () => number = Math.random): string =>
  `p${Date.now().toString(36)}${Math.floor(random() * 1e6).toString(36)}`;

export function makeProfile(
  name: string,
  taken: Profile[] = [],
  random: () => number = Math.random,
): Profile {
  // The first avatar nobody else has, so two children never look the same.
  const used = new Set(taken.map((p) => p.avatar));
  const avatar = AVATARS.find((a) => !used.has(a)) ?? AVATARS[taken.length % AVATARS.length];
  return {
    id: mintId(random),
    name: cleanName(name),
    avatar,
    createdAt: new Date().toISOString(),
  };
}

/**
 * A name a child typed. Trimmed and capped so it fits the pill it is shown
 * in; empty falls back rather than rendering a nameless button.
 */
export function cleanName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, 12);
  return trimmed === '' ? 'Player' : trimmed;
}

export const activeProfile = (store: ProfileStore): Profile | null =>
  store.profiles.find((p) => p.id === store.activeId) ?? store.profiles[0] ?? null;

export const canAddProfile = (store: ProfileStore): boolean =>
  store.profiles.length < MAX_PROFILES;

export function addProfile(store: ProfileStore, profile: Profile): ProfileStore {
  if (!canAddProfile(store)) return store;
  return { profiles: [...store.profiles, profile], activeId: profile.id };
}

export function renameProfile(store: ProfileStore, id: string, name: string): ProfileStore {
  return {
    ...store,
    profiles: store.profiles.map((p) => (p.id === id ? { ...p, name: cleanName(name) } : p)),
  };
}

/**
 * Removing a child deletes everything they did, so the caller has to clear
 * their storage too — this only forgets that they existed.
 *
 * The last profile cannot be removed: with none left there would be nobody to
 * switch to, and the next launch would mint a stranger and look like the
 * child's progress had been thrown away.
 */
export function removeProfile(store: ProfileStore, id: string): ProfileStore {
  if (store.profiles.length <= 1) return store;
  const profiles = store.profiles.filter((p) => p.id !== id);
  const activeId = store.activeId === id ? profiles[0].id : store.activeId;
  return { profiles, activeId };
}

export function switchTo(store: ProfileStore, id: string): ProfileStore {
  return store.profiles.some((p) => p.id === id) ? { ...store, activeId: id } : store;
}

/**
 * Repairs a store read off disk.
 *
 * A store with no active id, or one pointing at a child who is no longer
 * there, would leave every read keyed on nothing — which reads as a child
 * whose progress has vanished. Better to land on somebody real.
 */
export function settle(store: ProfileStore): ProfileStore {
  const profiles = store.profiles.filter((p) => p.id && p.name);
  if (profiles.length === 0) return emptyProfiles();
  const activeId = profiles.some((p) => p.id === store.activeId)
    ? store.activeId
    : profiles[0].id;
  return { profiles, activeId };
}
