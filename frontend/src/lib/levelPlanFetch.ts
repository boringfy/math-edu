/**
 * Getting level plans, and keeping them between launches.
 *
 * Split from `levelPlans` so that reading a plan costs nothing but a map
 * lookup: the pure level logic reads plans and must not pull storage or the
 * network in behind it.
 *
 * Nothing here is ever required. A plan that has not arrived, cannot be
 * fetched, or was thrown away simply is not there, and the caller composes
 * the level itself — which is what happens on every first run anyway.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTENT_URL } from '../content';
import { LevelPlan, clearPlans, hasPlan, planKey, setPlan, worthKeeping } from './levelPlans';
import { Grade } from '../types';

export const LEVELS_URL = process.env.EXPO_PUBLIC_LEVELS_URL ?? CONTENT_URL;

export const levelPlansAvailable = (): boolean => LEVELS_URL !== '';

const storageKey = (profile: string) =>
  profile === '' ? 'mathquiz:levelplans' : `mathquiz:p:${profile}:levelplans`;

export async function loadPlans(profile: string): Promise<void> {
  clearPlans();
  try {
    const raw = await AsyncStorage.getItem(storageKey(profile));
    if (!raw) return;
    for (const [key, plan] of Object.entries(JSON.parse(raw) as Record<string, LevelPlan>)) {
      setPlan(key, plan);
    }
  } catch {
    // A damaged cache is one the app composes around.
    clearPlans();
  }
}

async function persist(profile: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(profile), JSON.stringify(worthKeeping()));
  } catch {
    // Losing the cache costs a fetch, never a level.
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

export interface PlanRequest {
  subject: 'math' | 'logic';
  grade: Grade;
  level: number;
  firstComposedLevel: number;
  mastery: Record<string, number>;
  struggling: string[];
}

/**
 * Asks the server to plan a level, once.
 *
 * Returns whether anything new arrived, so the caller knows whether to
 * redraw. Never throws: the level it would have planned is the level the app
 * already has.
 */
export async function fetchPlan(request: PlanRequest, profile: string): Promise<boolean> {
  if (!levelPlansAvailable()) return false;
  const key = planKey(request.subject, request.grade, request.level);
  if (hasPlan(key)) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${LEVELS_URL}/v1/levels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) return false;

    const plan = (await response.json()) as LevelPlan;
    // A level the server composed the same way the app would have is not
    // worth holding on to, and not worth redrawing for.
    if (plan?.source !== 'ai') return false;
    if (!setPlan(key, plan)) return false;

    await persist(profile);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
