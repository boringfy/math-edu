/**
 * Progress along a map, over whatever content the library holds.
 *
 * This is what is left of `lessons.ts`, `stories.ts` and `puzzles.ts` once
 * the content moved to the server. Those files used to be a curriculum with
 * a few helpers at the bottom; this is the helpers, taking the curriculum as
 * an argument.
 *
 * Nothing here knows what a question is. It only knows that a map is an
 * ordered list of stops and that passing one opens the next — which is why
 * all three subjects share it.
 */

import { Grade, Lesson, MapStop, ProgressMap, PuzzleSet, Story } from '../types';
import { currentStop, isUnlocked as isStopUnlocked, starsEarned as starsOnMap } from './mapProgress';

/** Total questions asked at a maths stop, cake puzzles included. */
export const lessonLength = (lesson: Lesson): number => lesson.questionCount + lesson.drawCount;

export const wordCount = (text: string): number => text.trim().split(/\s+/).length;

/** Questions asked at a logic stop. */
export const setLength = (set: PuzzleSet): number => set.questionCount;

export const isUnlocked = (stops: MapStop[], stop: MapStop, progress: ProgressMap): boolean =>
  isStopUnlocked(stops, stop, progress);

export const currentOf = <T extends MapStop>(stops: T[], progress: ProgressMap): T | null =>
  stops.length === 0 ? null : (currentStop(stops, progress) as T);

export const starsEarned = (stops: MapStop[], progress: ProgressMap): number =>
  starsOnMap(stops, progress);

/** Labels for the reasoning families a logic stop draws on. */
export const FAMILY_LABEL: Record<string, string> = {
  sequence: 'numbers',
  letters: 'letters',
  oddWord: 'odd one out',
  oddNumber: 'number rules',
  analogy: 'word links',
  syllogism: 'reasoning',
  balance: 'balance',
  grid: 'deduction',
  series: 'patterns',
  matrix: 'grids',
  rotation: 'turning',
  mirror: 'mirrors',
  oddShape: 'shapes',
};

/** Narrowing helpers, so screens can stay generic over the three maps. */
export type AnyStop = Lesson | Story | PuzzleSet;

export const isLesson = (stop: AnyStop): stop is Lesson =>
  (stop as Lesson).drawCount !== undefined;

export const isStory = (stop: AnyStop): stop is Story =>
  (stop as Story).text !== undefined;

export const isPuzzleSet = (stop: AnyStop): stop is PuzzleSet =>
  !isLesson(stop) && !isStory(stop) && (stop as PuzzleSet).focus !== undefined;

export type { Grade };
