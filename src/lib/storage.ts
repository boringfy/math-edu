import AsyncStorage from '@react-native-async-storage/async-storage';
import { Grade, QuizResult, Tier } from '../types';

const HISTORY_KEY = 'mathquiz:history';
const tierKey = (grade: Grade) => `mathquiz:tier:${grade}`;
const MAX_HISTORY = 50;

export async function loadHistory(): Promise<QuizResult[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as QuizResult[]) : [];
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
