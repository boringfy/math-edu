import AsyncStorage from '@react-native-async-storage/async-storage';
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

// The 'mathquiz:' prefix is this app's storage namespace and predates the
// reading half; keys are never renamed, or saved progress would be orphaned.
const HISTORY_KEY = 'mathquiz:history';
const tierKey = (grade: Grade) => `mathquiz:tier:${grade}`;
const COINS_KEY = 'mathquiz:coins';
const DAILY_KEY = 'mathquiz:daily';
const SETTINGS_KEY = 'mathquiz:settings';
const progressKey: Record<Subject, string> = {
  math: 'mathquiz:lessons',
  reading: 'mathquiz:stories',
  logic: 'mathquiz:puzzles',
};
const MAX_HISTORY = 50;

export async function loadHistory(): Promise<QuizResult[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
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
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
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

export async function loadCoins(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(COINS_KEY);
    const coins = raw ? Number(raw) : 0;
    return Number.isFinite(coins) && coins >= 0 ? coins : 0;
  } catch {
    return 0;
  }
}

export async function saveCoins(coins: number): Promise<void> {
  await AsyncStorage.setItem(COINS_KEY, String(coins));
}

/** Map progress for one subject; the two subjects are stored separately. */
export async function loadProgress(subject: Subject): Promise<ProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(progressKey[subject]);
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
  await AsyncStorage.setItem(progressKey[subject], JSON.stringify(next));
  return next;
}

export async function loadDaily(): Promise<DailyState | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_KEY);
    return raw ? (JSON.parse(raw) as DailyState) : null;
  } catch {
    return null;
  }
}

export async function saveDaily(state: DailyState): Promise<void> {
  await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(state));
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
