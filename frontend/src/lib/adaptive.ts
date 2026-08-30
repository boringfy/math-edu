/**
 * How free practice adapts between rounds.
 *
 * Everything here is pure: a round's answers go in, a new state and the
 * things worth celebrating come out. Nothing is drawn, nothing is stored —
 * App.tsx owns the store and the library owns the pools. That split is what
 * keeps this testable, and what keeps it working on a bus: like grading,
 * adaptation must never need the network.
 *
 * The numbers live in the rules pack (`AdaptiveRules`) so a threshold that
 * turns out too eager can be softened server-side; `DEFAULT_ADAPTIVE` is the
 * compiled-in copy for a device that has never reached the server.
 */

import { AdaptiveRules, Tier } from '../types';

export interface TopicStat {
  /** Rolling window of the last answers in this topic, newest last. */
  window: boolean[];
  /** +N is N correct in a row, -N is N wrong in a row, across rounds. */
  streak: number;
  /** This topic's own difficulty. Pools are keyed `topic:tier`, so it draws. */
  tier: Tier;
  /** The round counter when this topic joined, for the new-topic weighting. */
  unlockedAtRound: number;
}

export interface AdaptiveState {
  version: 1;
  /** When this state last changed, for the cross-device merge. */
  updatedAt: string;
  /** Practice rounds played for this subject and grade. */
  rounds: number;
  /** Which question types are in play, in the order they were unlocked. */
  unlocked: string[];
  topics: Record<string, TopicStat>;
  /** Consecutive strong rounds so far, counting toward the next unlock. */
  hotRounds: number;
}

/** Keyed `${subject}:${grade}`; only math and logic practice adapt. */
export type AdaptiveStore = Record<string, AdaptiveState>;

export const adaptiveKey = (subject: 'math' | 'logic', grade: number): string =>
  `${subject}:${grade}`;

export type AdaptiveEvent =
  | { kind: 'unlock'; topic: string }
  | { kind: 'topicTier'; topic: string; direction: 'up' | 'down'; tier: Tier };

/** Identical to the authored values in the backend's rules.ts. */
export const DEFAULT_ADAPTIVE: AdaptiveRules = {
  strongRound: 0.9,
  unlockAfter: 2,
  perfectUnlocks: true,
  topicWindow: 10,
  topicUp: { minAttempts: 6, accuracy: 0.9 },
  topicDown: { minAttempts: 4, accuracy: 0.5, wrongStreak: 3 },
  roundUp: 0.9,
  roundDown: 0.5,
  newTopicWeight: 2,
  weakTopicWeight: 1.5,
  starterCount: { math: 3, logic: 3 },
  unlockOrder: {
    math: ['addSub', 'word', 'geometry', 'mulDiv', 'money', 'measurement',
           'place', 'time', 'speed', 'fractions', 'decimals', 'order'],
    logic: ['series', 'oddShape', 'matrix', 'rotation', 'sequence', 'oddWord',
            'letters', 'analogy', 'mirror', 'balance', 'oddNumber', 'grid', 'syllogism'],
  },
};

/**
 * The topic a pooled question came from, read out of its id — e.g.
 * "boring-quest-v1/math.g3:addSub:2#17" -> "addSub". Null for cake drawings
 * (their difficulty follows the round, not a topic), story questions and
 * anything unparseable, all of which stay out of the statistics.
 *
 * Not `tutorTopicOf`: that one is the server-facing contract and is math-only
 * on purpose, while this one has to attribute logic families too.
 */
export function topicOfId(id: string): string | null {
  // Two shapes, because questions come from two places now. A baked one
  // carries its pool: "boring-quest-v1/math.g3:addSub:2#1". A composed one
  // carries its lesson and skill: "math.g2.L7.l3:addSub#4".
  const match =
    /\/(?:math|logic)\.g\d+:([a-zA-Z]+):/.exec(id) ?? /\.L\d+\.l\d+:([a-zA-Z]+)#/.exec(id);
  const topic = match?.[1] ?? null;
  return topic === 'draw' ? null : topic;
}

const clampTier = (t: number): Tier => Math.max(1, Math.min(3, t)) as Tier;

const accuracyOf = (window: boolean[]): number =>
  window.length === 0 ? 1 : window.filter(Boolean).length / window.length;

/**
 * A student's opening state: the first few types of the ladder, all at the
 * given tier. `order` must already be intersected with the pools the grade
 * actually has (`Library.availableTopics`).
 */
export function initState(order: string[], starterCount: number, startTier: Tier): AdaptiveState {
  const unlocked = order.slice(0, Math.max(1, starterCount));
  const topics: Record<string, TopicStat> = {};
  for (const topic of unlocked) {
    topics[topic] = { window: [], streak: 0, tier: startTier, unlockedAtRound: 0 };
  }
  return { version: 1, updatedAt: new Date().toISOString(), rounds: 0, unlocked, topics, hotRounds: 0 };
}

/**
 * Folds one finished practice round into the state.
 *
 * Order matters: answers are recorded first, then struggling topics step
 * down before strong ones step up (a disastrous round must never promote),
 * and the unlock check runs last on the round as a whole.
 *
 * A type, once unlocked, is never taken away — a struggling student gets
 * easier tiers and a mix biased back toward weak topics, not a shrinking
 * world. At most one type unlocks per round, entering at tier 1.
 */
export function adaptRound(
  state: AdaptiveState,
  answers: { topic: string; correct: boolean }[],
  rules: AdaptiveRules,
  availableOrder: string[],
): { state: AdaptiveState; events: AdaptiveEvent[] } {
  const events: AdaptiveEvent[] = [];
  const topics: Record<string, TopicStat> = {};
  for (const [key, stat] of Object.entries(state.topics)) {
    topics[key] = { ...stat, window: [...stat.window] };
  }

  for (const answer of answers) {
    const stat = (topics[answer.topic] ??= {
      window: [],
      streak: 0,
      tier: 1,
      unlockedAtRound: state.rounds,
    });
    stat.window.push(answer.correct);
    if (stat.window.length > rules.topicWindow) stat.window.shift();
    stat.streak = answer.correct ? Math.max(1, stat.streak + 1) : Math.min(-1, stat.streak - 1);
  }

  const touched = new Set(answers.map((a) => a.topic));
  for (const topic of touched) {
    const stat = topics[topic];
    const accuracy = accuracyOf(stat.window);
    if (
      stat.streak <= -rules.topicDown.wrongStreak ||
      (stat.window.length >= rules.topicDown.minAttempts && accuracy < rules.topicDown.accuracy)
    ) {
      if (stat.tier > 1) {
        stat.tier = clampTier(stat.tier - 1);
        events.push({ kind: 'topicTier', topic, direction: 'down', tier: stat.tier });
      }
      // The slate is wiped either way, so one bad patch can't re-trigger.
      stat.window = [];
      stat.streak = 0;
    } else if (stat.window.length >= rules.topicUp.minAttempts && accuracy >= rules.topicUp.accuracy) {
      if (stat.tier < 3) {
        stat.tier = clampTier(stat.tier + 1);
        events.push({ kind: 'topicTier', topic, direction: 'up', tier: stat.tier });
        stat.window = [];
        stat.streak = 0;
      }
    }
  }

  const correct = answers.filter((a) => a.correct).length;
  const accuracy = answers.length === 0 ? 0 : correct / answers.length;
  let hotRounds = state.hotRounds;
  let unlocked = state.unlocked;

  if (answers.length > 0 && accuracy >= rules.strongRound) {
    hotRounds += 1;
    const ready = (accuracy === 1 && rules.perfectUnlocks) || hotRounds >= rules.unlockAfter;
    if (ready) {
      const next = availableOrder.find((topic) => !unlocked.includes(topic));
      if (next !== undefined) {
        unlocked = [...unlocked, next];
        topics[next] = { window: [], streak: 0, tier: 1, unlockedAtRound: state.rounds + 1 };
        events.push({ kind: 'unlock', topic: next });
        hotRounds = 0;
      }
    }
  } else {
    hotRounds = 0;
  }

  return {
    state: {
      version: 1,
      updatedAt: new Date().toISOString(),
      rounds: state.rounds + 1,
      unlocked,
      topics,
      hotRounds,
    },
    events,
  };
}

/**
 * The one number that stands in for the whole state, where a single tier is
 * still needed: the typed-entry share and the difficulty label. The median,
 * so one struggling topic doesn't drag the label to Easy.
 */
export function baseTier(state: AdaptiveState): Tier {
  const tiers = state.unlocked
    .map((topic) => state.topics[topic]?.tier)
    .filter((t): t is Tier => t !== undefined)
    .sort((a, b) => a - b);
  if (tiers.length === 0) return 2;
  return tiers[Math.floor((tiers.length - 1) / 2)];
}

/**
 * Which pools the next round should draw from, and how hard to lean on each:
 * a freshly unlocked topic gets extra showings so it is actually met, and a
 * weak topic gets extra practice rather than avoidance.
 *
 * A topic whose pool is missing at its tier slides to the nearest tier that
 * exists; a topic with no pool at all is skipped. An empty plan tells the
 * caller to fall back to the plain tier draw.
 */
export function practicePlan(
  state: AdaptiveState,
  rules: AdaptiveRules,
  poolKeys: string[],
): { key: string; weight: number }[] {
  const have = new Set(poolKeys);
  const plan: { key: string; weight: number }[] = [];

  for (const topic of state.unlocked) {
    const stat = state.topics[topic];
    if (!stat) continue;
    const tried = [stat.tier, clampTier(stat.tier - 1), clampTier(stat.tier + 1)];
    const tier = tried.find((t) => have.has(`${topic}:${t}`));
    if (tier === undefined) continue;

    let weight = 1;
    if (state.rounds - stat.unlockedAtRound < 3) weight *= rules.newTopicWeight;
    if (stat.window.length >= 4 && accuracyOf(stat.window) < 0.7) weight *= rules.weakTopicWeight;
    plan.push({ key: `${topic}:${tier}`, weight });
  }

  return plan;
}
