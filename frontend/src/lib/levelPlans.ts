/**
 * Levels the server helped plan.
 *
 * The app can always compose a level by itself, so this is decoration on top
 * of something that already works: a theme, better titles, a spread of skills
 * chosen by something that can read. Every plan the server sends has already
 * been checked against the same factory catalog the app would have used, so a
 * planned level is exactly as safe as a composed one.
 *
 * Plans are held here and read *synchronously* by the map and by the question
 * builder. That is deliberate: both have to agree about what lesson 73 is,
 * and the only way to guarantee that is for both to read the same answer
 * rather than each go and ask.
 *
 * Deliberately free of storage and network, so the modules that only need to
 * *read* a plan — which includes the pure level logic — do not drag either
 * in. Filling this is `levelPlanFetch`'s job.
 */

import { ComposedLesson } from '../content/factories/compose';
import { Grade } from '../types';

export interface LevelPlan {
  theme: string;
  lessons: ComposedLesson[];
  source: 'ai' | 'local';
}

export const planKey = (subject: string, grade: Grade, level: number): string =>
  `${subject}.g${grade}.L${level}`;

const plans = new Map<string, LevelPlan>();

/**
 * The plan for a level, if one has arrived. Synchronous on purpose — see the
 * note above about the map and the questions having to agree.
 */
export const plannedLevel = (
  subject: string,
  grade: Grade,
  level: number,
): LevelPlan | null => plans.get(planKey(subject, grade, level)) ?? null;

export const hasPlan = (key: string): boolean => plans.has(key);

/** A plan with no lessons is not a plan; it would blank a level. */
export function setPlan(key: string, plan: LevelPlan): boolean {
  if (!Array.isArray(plan?.lessons) || plan.lessons.length === 0) return false;
  plans.set(key, plan);
  return true;
}

/** Everything held, for persisting. Only the ones a model actually improved. */
export const worthKeeping = (): Record<string, LevelPlan> =>
  Object.fromEntries([...plans].filter(([, plan]) => plan.source === 'ai'));

/** Forgets everything, for a profile switch. */
export const clearPlans = (): void => plans.clear();
