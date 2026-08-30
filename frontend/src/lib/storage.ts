import AsyncStorage from '@react-native-async-storage/async-storage';
import { CursorState } from '../content/cursor';
import { AdaptiveStore } from './adaptive';
import {
  DailyState,
  DEFAULT_SETTINGS,
  Grade,
  ProgressMap,
  QuizResult,
  Settings,
  StopProgress,
  Subject,
  Tier,
} from '../types';
import { Profile, ProfileStore, emptyProfiles, makeProfile, settle } from './profiles';
import { UnlockMap, emptyUnlocks } from './unlocks';

// The 'mathquiz:' prefix is this app's storage namespace and predates the
// reading half; keys are never renamed, or saved progress would be orphaned.
//
// Everything a child earns hangs off whichever profile is playing, so those
// keys carry the profile id. What belongs to the device — the grown-up
// settings, the sync identity, the content cache — deliberately does not, or
// two children would mean downloading the same packs twice.

/** Whose data the per-child reads and writes below refer to. */
let profile = '';

/**
 * Points storage at a child. Called once at launch and again on every
 * switch, before anything is read.
 *
 * An empty id means "before profiles existed" and falls back to the original
 * un-prefixed keys, which is what lets a device that has never switched
 * profile keep reading exactly what it always read.
 */
export function useProfile(id: string): void {
  profile = id;
}

/** For tests, which must not inherit each other's profile. */
export const currentProfile = (): string => profile;

const scoped = (name: string): string =>
  profile === '' ? `mathquiz:${name}` : `mathquiz:p:${profile}:${name}`;

const HISTORY = () => scoped('history');
const tierKey = (grade: Grade) => scoped(`tier:${grade}`);
const COINS = () => scoped('coins');
const DAILY = () => scoped('daily');
const CURSORS = () => scoped('cursors');
const GRADES = () => scoped('grades');
const ADAPTIVE = () => scoped('adaptive');
const UNLOCKS = () => scoped('unlocks');
const progressKey = (subject: Subject): string =>
  scoped({ math: 'lessons', reading: 'stories', logic: 'puzzles' }[subject]);

/** Device-wide, not per child: a grown-up sets this once for the tablet. */
const SETTINGS_KEY = 'mathquiz:settings';
const PROFILES_KEY = 'mathquiz:profiles';

/** The per-child keys, for migrating a device that predates profiles. */
const PER_CHILD = [
  'history',
  'coins',
  'daily',
  'cursors',
  'grades',
  'adaptive',
  'unlocks',
  'lessons',
  'stories',
  'puzzles',
  'tier:1',
  'tier:2',
  'tier:3',
  'tier:4',
  'tier:5',
];

const MAX_HISTORY = 50;

export async function loadHistory(): Promise<QuizResult[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY());
    const stored = raw ? (JSON.parse(raw) as QuizResult[]) : [];
    // Results saved before the reading half existed are all math results.
    return stored.map((r) => ({ ...r, subject: r.subject ?? 'math' }));
  } catch {
    return [];
  }
}

/** Upserts by result id (the same session is saved again after corrections). */
export async function saveResult(result: QuizResult): Promise<void> {
  const history = await loadHistory();
  const rest = history.filter((r) => r.id !== result.id);
  const next = [result, ...rest].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(HISTORY(), JSON.stringify(next));
}

/** Replaces the whole history — the sync merge writes its result with this. */
export async function saveHistoryList(history: QuizResult[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY(), JSON.stringify(history.slice(0, MAX_HISTORY)));
}

/** Replaces a subject's whole map — the sync merge writes its result with this. */
export async function saveProgressMap(subject: Subject, map: ProgressMap): Promise<void> {
  await AsyncStorage.setItem(progressKey(subject), JSON.stringify(map));
}

export async function loadTier(grade: Grade): Promise<Tier> {
  try {
    const raw = await AsyncStorage.getItem(tierKey(grade));
    const tier = raw ? Number(raw) : 2;
    return tier === 1 || tier === 2 || tier === 3 ? tier : 2;
  } catch {
    return 2;
  }
}

export async function saveTier(grade: Grade, tier: Tier): Promise<void> {
  await AsyncStorage.setItem(tierKey(grade), String(tier));
}

/**
 * How practice has adapted so far: unlocked types and per-topic tiers, for
 * every subject and grade in one blob. Absent for anyone who has not played
 * an adaptive round yet — App.tsx seeds a starter state lazily.
 */
export async function loadAdaptive(): Promise<AdaptiveStore> {
  try {
    const raw = await AsyncStorage.getItem(ADAPTIVE());
    return raw ? (JSON.parse(raw) as AdaptiveStore) : {};
  } catch {
    return {};
  }
}

export async function saveAdaptive(store: AdaptiveStore): Promise<void> {
  try {
    await AsyncStorage.setItem(ADAPTIVE(), JSON.stringify(store));
  } catch {
    // Losing this costs adaptation history, never a broken quiz.
  }
}

export async function loadCoins(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(COINS());
    const coins = raw ? Number(raw) : 0;
    return Number.isFinite(coins) && coins >= 0 ? coins : 0;
  } catch {
    return 0;
  }
}

export async function saveCoins(coins: number): Promise<void> {
  await AsyncStorage.setItem(COINS(), String(coins));
}

/** Map progress for one subject; the two subjects are stored separately. */
export async function loadProgress(subject: Subject): Promise<ProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(progressKey(subject));
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

/** Keeps the best run: a weaker replay never takes stars away. */
export async function saveProgress(
  subject: Subject,
  stopId: string,
  progress: StopProgress,
): Promise<ProgressMap> {
  const all = await loadProgress(subject);
  const previous = all[stopId];
  const next: ProgressMap = {
    ...all,
    [stopId]: previous
      ? {
          stars: Math.max(previous.stars, progress.stars) as StopProgress['stars'],
          bestPercent: Math.max(previous.bestPercent, progress.bestPercent),
          clearedAt: previous.stars > 0 ? previous.clearedAt : progress.clearedAt,
        }
      : progress,
  };
  await AsyncStorage.setItem(progressKey(subject), JSON.stringify(next));
  return next;
}

export async function loadDaily(): Promise<DailyState | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY());
    return raw ? (JSON.parse(raw) as DailyState) : null;
  } catch {
    return null;
  }
}

export async function saveDaily(state: DailyState): Promise<void> {
  await AsyncStorage.setItem(DAILY(), JSON.stringify(state));
}

/** Anything a stored settings blob is missing falls back to the default. */
export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * How far through each question pool this device has walked.
 *
 * Saved so the walk survives a restart — otherwise every launch would start
 * the same shuffle again and the first lesson of the day would always ask
 * the same questions.
 */
export async function loadCursors(): Promise<CursorState> {
  try {
    const raw = await AsyncStorage.getItem(CURSORS());
    return raw ? (JSON.parse(raw) as CursorState) : {};
  } catch {
    return {};
  }
}

export async function saveCursors(state: CursorState): Promise<void> {
  try {
    await AsyncStorage.setItem(CURSORS(), JSON.stringify(state));
  } catch {
    // Losing the cursor costs a little repetition, never a broken quiz.
  }
}

/**
 * Which grade each subject is on.
 *
 * Kept per subject rather than one for the whole app: a child who reads
 * ahead of their arithmetic, or the other way round, should not have to
 * choose which of the two to get wrong.
 *
 * Saved, because a picker that forgets is worse than no picker — every
 * launch would drop the child back into grade 1 and leave them to notice.
 */
export async function loadGrades(): Promise<Record<Subject, Grade>> {
  const fallback: Record<Subject, Grade> = { math: 1, reading: 1, logic: 1 };
  try {
    const raw = await AsyncStorage.getItem(GRADES());
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as Partial<Record<Subject, unknown>>;
    const valid = (value: unknown): value is Grade =>
      value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
    return {
      math: valid(stored.math) ? stored.math : fallback.math,
      reading: valid(stored.reading) ? stored.reading : fallback.reading,
      logic: valid(stored.logic) ? stored.logic : fallback.logic,
    };
  } catch {
    return fallback;
  }
}

export async function saveGrades(grades: Record<Subject, Grade>): Promise<void> {
  await AsyncStorage.setItem(GRADES(), JSON.stringify(grades));
}

/**
 * The lessons bought so far.
 *
 * One key for all three subjects rather than one each: it is a short list of
 * ids and it is read on every map draw, so a single small read beats three.
 * A missing or damaged value means "nothing bought yet", which costs a child
 * coins they have already spent — so it is written before the coins are
 * deducted, never after.
 */
export async function loadUnlocks(): Promise<UnlockMap> {
  try {
    const raw = await AsyncStorage.getItem(UNLOCKS());
    if (!raw) return emptyUnlocks();
    const stored = JSON.parse(raw) as Record<string, unknown>;
    const out = emptyUnlocks();
    for (const subject of Object.keys(out)) {
      const ids = stored[subject];
      if (Array.isArray(ids)) out[subject] = ids.filter((id): id is string => typeof id === 'string');
    }
    return out;
  } catch {
    return emptyUnlocks();
  }
}

export async function saveUnlocks(unlocks: UnlockMap): Promise<void> {
  await AsyncStorage.setItem(UNLOCKS(), JSON.stringify(unlocks));
}

/**
 * Who is on this device, and whose turn it is.
 *
 * Device-wide by definition — it is the thing that decides which child's
 * keys the rest of this file reads.
 */
export async function loadProfiles(): Promise<ProfileStore> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    if (!raw) return emptyProfiles();
    const stored = JSON.parse(raw) as Partial<ProfileStore>;
    if (!Array.isArray(stored.profiles)) return emptyProfiles();
    return settle({
      profiles: stored.profiles.filter(
        (p): p is Profile =>
          typeof p?.id === 'string' &&
          typeof p?.name === 'string' &&
          typeof p?.avatar === 'string',
      ),
      activeId: typeof stored.activeId === 'string' ? stored.activeId : '',
    });
  } catch {
    return emptyProfiles();
  }
}

export async function saveProfiles(store: ProfileStore): Promise<void> {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(store));
}

/**
 * Gives a device that predates profiles its first one, carrying everything
 * already on it across.
 *
 * The keys are *copied*, not moved. A child two hundred lessons into grade 2
 * is the whole reason this exists, and leaving the originals where they are
 * means a build rolled back still finds them — the same courtesy the tier
 * dial gets. They cost a few kilobytes and are written once.
 *
 * Returns the store to use, and does nothing at all if profiles already
 * exist, so it is safe to call on every launch.
 */
export async function migrateToProfiles(name = 'Player 1'): Promise<ProfileStore> {
  const existing = await loadProfiles();
  if (existing.profiles.length > 0) return existing;

  const profile = makeProfile(name);
  const store = { profiles: [profile], activeId: profile.id };

  const pairs = await AsyncStorage.multiGet(PER_CHILD.map((n) => `mathquiz:${n}`));
  const carried = pairs
    .filter(([, value]) => value !== null)
    .map(([key, value]) => [
      `mathquiz:p:${profile.id}:${key.slice('mathquiz:'.length)}`,
      value as string,
    ]) as [string, string][];

  // The data lands before the profile does. If this were the other way round
  // and the app died between them, the child would open a profile that looked
  // brand new — every star gone, with the old keys still sitting there
  // unreachable.
  if (carried.length > 0) await AsyncStorage.multiSet(carried);
  await saveProfiles(store);
  return store;
}

/** Everything one child earned, for when they are removed from the device. */
export async function forgetProfile(id: string): Promise<void> {
  await AsyncStorage.multiRemove(PER_CHILD.map((n) => `mathquiz:p:${id}:${n}`));
}
