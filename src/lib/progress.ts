import { CoinAward, DailyState, DayMetrics } from '../types';

/**
 * Coins reward getting things right rather than merely turning up: every
 * correct answer pays, a clean run pays a bonus on top, and streaks pay
 * again. Nothing is ever deducted — a bad run just earns less.
 */
export const COIN_RATES = {
  correct: 2,
  /** A mistake put right in the correction round still counts, at half rate. */
  fixed: 1,
  comboMilestone: 3,
  perfect: 10,
  /** Paid once, the first time a lesson is passed. */
  firstClear: 5,
};

/** Streaks pay at 3 in a row and every other correct answer after that. */
export const FIRST_COMBO = 3;

export const isComboMilestone = (streak: number): boolean =>
  streak >= FIRST_COMBO && (streak - FIRST_COMBO) % 2 === 0;

/** How many milestones a run of `bestCombo` passed through. */
export const comboMilestones = (bestCombo: number): number =>
  bestCombo < FIRST_COMBO ? 0 : Math.floor((bestCombo - FIRST_COMBO) / 2) + 1;

const award = (parts: Omit<CoinAward, 'total'>): CoinAward => ({
  ...parts,
  total: parts.correct + parts.fixed + parts.combo + parts.perfect + parts.firstClear +
    parts.challenges,
});

export function lessonAward(opts: {
  correctCount: number;
  total: number;
  bestCombo: number;
  firstClear: boolean;
}): CoinAward {
  const perfect = opts.total > 0 && opts.correctCount === opts.total;
  return award({
    correct: opts.correctCount * COIN_RATES.correct,
    fixed: 0,
    combo: comboMilestones(opts.bestCombo) * COIN_RATES.comboMilestone,
    perfect: perfect ? COIN_RATES.perfect : 0,
    firstClear: opts.firstClear ? COIN_RATES.firstClear : 0,
    challenges: 0,
  });
}

export function correctionAward(fixedCount: number): CoinAward {
  return award({
    correct: 0,
    fixed: fixedCount * COIN_RATES.fixed,
    combo: 0,
    perfect: 0,
    firstClear: 0,
    challenges: 0,
  });
}

export interface ChallengeDef {
  id: string;
  title: string;
  icon: string;
  target: number;
  /** Coins paid the moment the target is reached. */
  reward: number;
  metric: keyof DayMetrics;
  /** 'max' for streaks, where a longer run replaces rather than adds to it. */
  mode: 'sum' | 'max';
}

/**
 * Challenges span both subjects: a reading story counts wherever a lesson
 * does, so a day can be finished off in either half of the app.
 *
 * Three buckets, one challenge drawn from each per day: something you get
 * just for playing, something about accuracy, and something about streaks.
 * Drawing one per bucket keeps a day from being three hard goals at once.
 */
const BUCKETS: ChallengeDef[][] = [
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
];

export const CHALLENGES: Record<string, ChallengeDef> = Object.fromEntries(
  BUCKETS.flat().map((c) => [c.id, c]),
);

/** Local calendar day, so the challenges roll over at the player's midnight. */
export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function hashDate(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h = (Math.imul(h, 16777619) ^ date.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** The same date always yields the same three challenges. */
export function pickChallenges(date: string): string[] {
  const h = hashDate(date);
  return BUCKETS.map((bucket, i) => bucket[(h >>> (i * 7)) % bucket.length].id);
}

export const freshDaily = (date: string): DailyState => ({
  date,
  challengeIds: pickChallenges(date),
  progress: {},
  claimed: [],
});

/** Rolls the state over to `date` if it was left behind on an earlier day. */
export const dailyForDate = (state: DailyState | null, date: string): DailyState =>
  state && state.date === date ? state : freshDaily(date);

export const emptyMetrics = (): DayMetrics => ({
  lessonsPlayed: 0,
  lessonsCleared: 0,
  perfectLessons: 0,
  correctAnswers: 0,
  mistakesFixed: 0,
  bestCombo: 0,
  coinsEarned: 0,
});

export interface DailyUpdate {
  state: DailyState;
  /** Challenges whose target was reached by this session, for the results screen. */
  completed: ChallengeDef[];
  /** Reward coins those completions paid out. */
  coins: number;
}

/** Folds one session's metrics into the day, paying out anything finished. */
export function applyMetrics(state: DailyState, metrics: DayMetrics): DailyUpdate {
  const progress = { ...state.progress };
  const claimed = [...state.claimed];
  const completed: ChallengeDef[] = [];
  let coins = 0;

  for (const id of state.challengeIds) {
    const def = CHALLENGES[id];
    if (!def) continue;
    const before = progress[id] ?? 0;
    const value = metrics[def.metric];
    progress[id] = def.mode === 'max' ? Math.max(before, value) : before + value;
    if (progress[id] >= def.target && !claimed.includes(id)) {
      claimed.push(id);
      completed.push(def);
      coins += def.reward;
    }
  }

  return { state: { ...state, progress, claimed }, completed, coins };
}
