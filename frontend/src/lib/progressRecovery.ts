import { authoredLevels, parseComposedId, LESSONS_PER_LEVEL } from './endless';
import { starsFor } from './mapProgress';
import { Grade, MapStop, ProgressMap, QuizResult, Stars, Subject } from '../types';

/**
 * Rebuilds a map from its audit history when older builds saved results but
 * omitted some stop progress. A later cleared stop proves the earlier stops
 * were open, even when their results have aged out of the 30-day history.
 * Unknown older scores get only one star; results retain their real scores.
 */
export function recoverMapProgress(
  subject: Subject,
  grade: Grade,
  authored: MapStop[],
  progress: ProgressMap,
  history: QuizResult[],
): ProgressMap {
  const authoredIndex = new Map(authored.map((stop) => [stop.id, stop.index]));
  const firstComposedLevel = authoredLevels(authored) + 1;
  const indexOf = (id: string): number | null => {
    const written = authoredIndex.get(id);
    if (written !== undefined) return written;
    const parsed = parseComposedId(id);
    if (!parsed || parsed.subject !== subject || parsed.grade !== grade ||
        parsed.level < firstComposedLevel || parsed.position < 1 ||
        parsed.position > LESSONS_PER_LEVEL) return null;
    return (parsed.level - 1) * LESSONS_PER_LEVEL + parsed.position;
  };

  let recovered = progress;
  let furthest = 0;
  let evidenceDate = new Date().toISOString();
  for (const [id, stop] of Object.entries(progress)) {
    const index = indexOf(id);
    if (index !== null && stop.stars > 0 && index > furthest) {
      furthest = index;
      evidenceDate = stop.clearedAt;
    }
  }

  for (const result of history) {
    if (result.subject !== subject || result.grade !== grade || !result.stopId) continue;
    const index = indexOf(result.stopId);
    if (index === null) continue;
    const stars = result.stars ?? starsFor(result.correctCount, result.total);
    if (stars === 0) continue;
    if (index > furthest) {
      furthest = index;
      evidenceDate = result.date;
    }
    const previous = recovered[result.stopId];
    const percent = result.total > 0 ? Math.round(result.correctCount / result.total * 100) : 0;
    const next = {
      stars: Math.max(previous?.stars ?? 0, stars) as Stars,
      bestPercent: Math.max(previous?.bestPercent ?? 0, percent),
      clearedAt: previous?.clearedAt && previous.clearedAt < result.date
        ? previous.clearedAt : result.date,
    };
    if (!previous || previous.stars !== next.stars ||
        previous.bestPercent !== next.bestPercent || previous.clearedAt !== next.clearedAt) {
      if (recovered === progress) recovered = { ...progress };
      recovered[result.stopId] = next;
    }
  }

  // The map UI walks from its first unfinished stop. Fill only gaps that a
  // later clear proves were passed; never invent a score for the frontier.
  for (let index = 1; index < furthest && index <= 5_000; index++) {
    const level = Math.floor((index - 1) / LESSONS_PER_LEVEL) + 1;
    const position = ((index - 1) % LESSONS_PER_LEVEL) + 1;
    const id = index <= authored.length
      ? authored[index - 1].id
      : `${subject}.g${grade}.L${level}.l${position}`;
    if ((recovered[id]?.stars ?? 0) > 0) continue;
    if (recovered === progress) recovered = { ...progress };
    recovered[id] = { stars: 1, bestPercent: 0, clearedAt: evidenceDate };
  }
  return recovered;
}
