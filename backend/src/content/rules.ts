/**
 * The tunable half of progression, shipped as content.
 *
 * These numbers used to be constants in the app, which meant that finding
 * the daily challenges too hard, or coins too stingy, was a release. They
 * are data now. The client keeps an identical compiled-in copy as its
 * offline fallback, so a device that has never reached the server still
 * plays with sensible numbers.
 */

import type { Rules } from '../contract';

export const RULES: Rules = {
  coinRates: {
    correct: 2,
    fixed: 1,
    comboMilestone: 3,
    perfect: 10,
    firstClear: 5,
  },
  firstCombo: 3,
  challengeBuckets: [
    [
      { id: 'finishLesson', title: 'Finish a lesson or story', icon: '🎓', target: 1, reward: 15, metric: 'lessonsCleared', mode: 'sum' },
      { id: 'playTwo', title: 'Play 2 rounds', icon: '🎮', target: 2, reward: 20, metric: 'lessonsPlayed', mode: 'sum' },
      { id: 'correct15', title: 'Get 15 answers right', icon: '✅', target: 15, reward: 20, metric: 'correctAnswers', mode: 'sum' },
    ],
    [
      { id: 'perfectLesson', title: 'Get a round completely right', icon: '🌟', target: 1, reward: 30, metric: 'perfectLessons', mode: 'sum' },
      { id: 'fixTwo', title: 'Fix 2 mistakes', icon: '🔧', target: 2, reward: 20, metric: 'mistakesFixed', mode: 'sum' },
      { id: 'correct25', title: 'Get 25 answers right', icon: '🎯', target: 25, reward: 30, metric: 'correctAnswers', mode: 'sum' },
    ],
    [
      { id: 'combo3', title: 'Get 3 right in a row', icon: '🔥', target: 3, reward: 15, metric: 'bestCombo', mode: 'max' },
      { id: 'combo5', title: 'Get 5 right in a row', icon: '🔥', target: 5, reward: 25, metric: 'bestCombo', mode: 'max' },
      { id: 'earnCoins', title: 'Earn 60 coins', icon: '🪙', target: 60, reward: 25, metric: 'coinsEarned', mode: 'sum' },
    ],
  ],
  entryShare: { 1: 0.25, 2: 0.5, 3: 0.75 },
  starThresholds: { three: 100, two: 80, one: 50 },
  // Checked against the award function, not guessed: over a level of ten,
  // two stars pays at least 191 against a cost of 180, and one star pays
  // 150. See the note on `unlockCost` in the contract, and the sums in
  // `unlocks.test.ts`.
  unlockCost: 18,
  // Stories stay free; sums and puzzles are what the coins are for.
  paidSubjects: ['math', 'logic'],
  adaptive: {
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
    // Front-loads what every grade's pack has, so the starter set after
    // intersecting with the grade's pools is never thin. The logic order is
    // the pedagogical ramp already encoded in puzzles.ts AVAILABLE.
    unlockOrder: {
      math: ['addSub', 'word', 'geometry', 'mulDiv', 'money', 'measurement',
             'place', 'time', 'speed', 'fractions', 'decimals', 'order'],
      logic: ['series', 'oddShape', 'matrix', 'rotation', 'sequence', 'oddWord',
              'letters', 'analogy', 'mirror', 'balance', 'oddNumber', 'grid', 'syllogism'],
    },
  },
};
