import { QuizResult } from '../types';

export const HISTORY_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Newest first, with only results inside the rolling retention window. */
export function recentHistory(history: QuizResult[], now = new Date()): QuizResult[] {
  const cutoff = now.getTime() - HISTORY_RETENTION_DAYS * DAY_MS;
  return history
    .filter((result) => {
      const time = Date.parse(result.date);
      return Number.isFinite(time) && time >= cutoff;
    })
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
