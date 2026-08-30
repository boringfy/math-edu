import { Tier } from '../../types';
import {
  AdaptiveState,
  DEFAULT_ADAPTIVE,
  adaptRound,
  baseTier,
  initState,
  practicePlan,
  topicOfId,
} from '../adaptive';

const rules = DEFAULT_ADAPTIVE;

/** A round of one topic, `right` correct answers out of `total`. */
const round = (topic: string, right: number, total: number) =>
  Array.from({ length: total }, (_, i) => ({ topic, correct: i < right }));

const state = (over: Partial<AdaptiveState> = {}): AdaptiveState => ({
  version: 1,
  updatedAt: '2026-08-29T00:00:00.000Z',
  rounds: 5,
  unlocked: ['addSub', 'word'],
  topics: {
    addSub: { window: [], streak: 0, tier: 2, unlockedAtRound: 0 },
    word: { window: [], streak: 0, tier: 2, unlockedAtRound: 0 },
  },
  hotRounds: 0,
  ...over,
});

describe('topicOfId', () => {
  it('reads the topic out of math and logic ids alike', () => {
    expect(topicOfId('boring-quest-v1/math.g3:addSub:2#17')).toBe('addSub');
    expect(topicOfId('boring-quest-v1/logic.g3:matrix:1#5')).toBe('matrix');
  });

  /**
   * Composed lessons carry their skill differently, and if this missed them
   * every answer past lesson 60 would be filed under nothing — the levels
   * would climb but never respond to how the child was actually doing.
   */
  it('reads the skill out of a composed lesson too', () => {
    expect(topicOfId('math.g2.L7.l3:addSub#4')).toBe('addSub');
    expect(topicOfId('logic.g4.L12.l10:matrix#1')).toBe('matrix');
  });

  it('keeps drawings and stories out of the statistics', () => {
    expect(topicOfId('boring-quest-v1/math.g2:draw:2#3')).toBeNull();
    expect(topicOfId('math.g2.L8.l12:draw#6')).toBeNull();
    expect(topicOfId('g1-s1-q2')).toBeNull();
  });
});

describe('initState', () => {
  it('starts with the front of the ladder at the given tier', () => {
    const s = initState(['addSub', 'word', 'geometry', 'mulDiv'], 3, 3);
    expect(s.unlocked).toEqual(['addSub', 'word', 'geometry']);
    expect(s.topics.addSub.tier).toBe(3);
    expect(s.rounds).toBe(0);
  });

  it('never starts with nothing, even when asked to', () => {
    expect(initState(['addSub'], 0, 2).unlocked).toEqual(['addSub']);
  });
});

describe('unlocking new question types', () => {
  it('unlocks the next type on a perfect round', () => {
    const { state: next, events } = adaptRound(state(), round('addSub', 6, 6), rules, [
      'addSub',
      'word',
      'geometry',
    ]);
    expect(next.unlocked).toContain('geometry');
    expect(events).toContainEqual({ kind: 'unlock', topic: 'geometry' });
    // A new type starts gently, and is boosted so it actually appears.
    expect(next.topics.geometry.tier).toBe(1);
    expect(next.topics.geometry.unlockedAtRound).toBe(next.rounds);
  });

  it('unlocks after two strong-but-not-perfect rounds', () => {
    const order = ['addSub', 'word', 'geometry'];
    const one = adaptRound(state(), round('addSub', 9, 10), rules, order);
    expect(one.state.unlocked).not.toContain('geometry');
    expect(one.state.hotRounds).toBe(1);
    const two = adaptRound(one.state, round('addSub', 9, 10), rules, order);
    expect(two.state.unlocked).toContain('geometry');
    expect(two.state.hotRounds).toBe(0);
  });

  it('a weak round resets the streak toward the unlock', () => {
    const order = ['addSub', 'word', 'geometry'];
    const one = adaptRound(state(), round('addSub', 9, 10), rules, order);
    const slump = adaptRound(one.state, round('addSub', 5, 10), rules, order);
    expect(slump.state.hotRounds).toBe(0);
    expect(slump.state.unlocked).not.toContain('geometry');
  });

  it('unlocks at most one type per round, and only types the grade has', () => {
    const { state: next } = adaptRound(state(), round('addSub', 6, 6), rules, [
      'addSub',
      'word',
      'geometry',
      'mulDiv',
    ]);
    expect(next.unlocked).toEqual(['addSub', 'word', 'geometry']);
    // Nothing left to unlock: the round still counts, nothing breaks.
    const done = adaptRound(state(), round('addSub', 6, 6), rules, ['addSub', 'word']);
    expect(done.state.unlocked).toEqual(['addSub', 'word']);
    expect(done.events.filter((e) => e.kind === 'unlock')).toEqual([]);
  });
});

describe('per-topic difficulty', () => {
  it('steps a topic down after three wrong in a row', () => {
    const { state: next, events } = adaptRound(state(), round('word', 0, 3), rules, []);
    expect(next.topics.word.tier).toBe(1);
    expect(events).toContainEqual({ kind: 'topicTier', topic: 'word', direction: 'down', tier: 1 });
    // The slate is wiped so one bad patch cannot trigger twice.
    expect(next.topics.word.window).toEqual([]);
  });

  it('steps a topic down on poor accuracy over enough attempts', () => {
    const { state: next } = adaptRound(state(), [
      { topic: 'word', correct: false },
      { topic: 'word', correct: true },
      { topic: 'word', correct: false },
      { topic: 'word', correct: false },
    ], rules, []);
    expect(next.topics.word.tier).toBe(1);
  });

  it('steps a topic up on sustained accuracy, and never past hard', () => {
    const up = adaptRound(state(), round('addSub', 6, 6), rules, []);
    expect(up.state.topics.addSub.tier).toBe(3);
    const capped = adaptRound(up.state, round('addSub', 6, 6), rules, []);
    expect(capped.state.topics.addSub.tier).toBe(3);
    expect(capped.events.filter((e) => e.kind === 'topicTier')).toEqual([]);
  });

  it('never steps below easy, and a floor round emits no event', () => {
    const floor = state({
      topics: {
        addSub: { window: [], streak: 0, tier: 1, unlockedAtRound: 0 },
        word: { window: [], streak: 0, tier: 2, unlockedAtRound: 0 },
      },
    });
    const { state: next, events } = adaptRound(floor, round('addSub', 0, 3), rules, []);
    expect(next.topics.addSub.tier).toBe(1);
    expect(events.filter((e) => e.kind === 'topicTier')).toEqual([]);
  });

  it('a disastrous round steps down without also promoting', () => {
    // Six attempts, three right — below the down threshold, but with enough
    // attempts to satisfy the up rule's minimum if it were checked first.
    const seeded = state({
      topics: {
        addSub: { window: [true, true], streak: 2, tier: 2, unlockedAtRound: 0 },
        word: { window: [], streak: 0, tier: 2, unlockedAtRound: 0 },
      },
    });
    const { state: next } = adaptRound(seeded, round('addSub', 0, 4), rules, []);
    expect(next.topics.addSub.tier).toBe(1);
  });

  it('keeps the rolling window to its size', () => {
    let s = state();
    for (let i = 0; i < 4; i++) {
      s = adaptRound(s, round('addSub', 2, 4), rules, []).state;
    }
    expect(s.topics.addSub.window.length).toBeLessThanOrEqual(rules.topicWindow);
  });
});

describe('rounds that teach it nothing', () => {
  it('counts a round of nothing but drawings without changing anything', () => {
    // Cake puzzles carry no topic, so a round of them adapts nothing — but it
    // must not read as a failed round either.
    const before = state({ hotRounds: 1 });
    const { state: after, events } = adaptRound(before, [], rules, ['addSub', 'word', 'geometry']);

    expect(events).toEqual([]);
    expect(after.rounds).toBe(before.rounds + 1);
    expect(after.unlocked).toEqual(before.unlocked);
    // An empty round is not a strong one, so the run toward an unlock resets.
    expect(after.hotRounds).toBe(0);
  });

  it('stamps the time so two devices can be told apart later', () => {
    const before = state({ updatedAt: '2020-01-01T00:00:00.000Z' });
    const { state: after } = adaptRound(before, round('addSub', 1, 1), rules, []);
    expect(Date.parse(after.updatedAt)).toBeGreaterThan(Date.parse(before.updatedAt));
  });

  it('leaves the state it was given untouched', () => {
    // App.tsx keeps the store in React state, so a mutated argument would be
    // a render that never happens.
    const before = state();
    const snapshot = JSON.stringify(before);
    adaptRound(before, round('addSub', 0, 4), rules, ['addSub', 'word', 'geometry']);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('records a topic met outside the unlocked set without unlocking it', () => {
    // A lesson can leave a stray question of another topic in a practice
    // draw; it should count, but not silently join the rotation.
    const { state: after } = adaptRound(state(), round('money', 1, 1), rules, []);
    expect(after.topics.money.window).toEqual([true]);
    expect(after.unlocked).not.toContain('money');
  });
});

describe('baseTier', () => {
  const at = (tiers: Tier[]): AdaptiveState =>
    state({
      unlocked: tiers.map((_, i) => `t${i}`),
      topics: Object.fromEntries(
        tiers.map((tier, i) => [`t${i}`, { window: [], streak: 0, tier, unlockedAtRound: 0 }]),
      ),
    });

  it('is the median of the unlocked topics', () => {
    expect(baseTier(at([1, 2, 3]))).toBe(2);
    expect(baseTier(at([1, 1, 3]))).toBe(1);
    expect(baseTier(at([3, 3, 1]))).toBe(3);
  });

  it('defaults to normal with nothing to go on', () => {
    expect(baseTier(state({ unlocked: [], topics: {} }))).toBe(2);
  });
});

describe('practicePlan', () => {
  const pools = ['addSub:1', 'addSub:2', 'addSub:3', 'word:1', 'word:2', 'draw:2'];

  it('draws each unlocked topic at its own tier', () => {
    const plan = practicePlan(state(), rules, pools);
    expect(plan).toContainEqual({ key: 'addSub:2', weight: 1 });
    expect(plan).toContainEqual({ key: 'word:2', weight: 1 });
  });

  it('slides to a nearby tier when the exact pool is missing', () => {
    const s = state({
      topics: {
        addSub: { window: [], streak: 0, tier: 2, unlockedAtRound: 0 },
        word: { window: [], streak: 0, tier: 3, unlockedAtRound: 0 },
      },
    });
    const plan = practicePlan(s, rules, pools);
    // word has no :3 pool, so its draw slides down to :2.
    expect(plan.map((p) => p.key)).toContain('word:2');
  });

  it('skips a topic the grade has no pools for at all', () => {
    const s = state({ unlocked: ['addSub', 'fractions'] });
    const plan = practicePlan(s, rules, pools);
    expect(plan.map((p) => p.key)).toEqual(['addSub:2']);
  });

  it('asks for nothing when the pack has none of the unlocked topics', () => {
    // The caller falls back to a plain tier draw on an empty plan, so this
    // must be empty rather than a key that draws no questions.
    expect(practicePlan(state(), rules, ['fractions:1'])).toEqual([]);
  });

  it('compounds the two boosts for a new topic that is also going badly', () => {
    const s = state({
      rounds: 6,
      unlocked: ['addSub'],
      topics: {
        addSub: { window: [false, false, true, false], streak: -1, tier: 2, unlockedAtRound: 5 },
      },
    });
    expect(practicePlan(s, rules, ['addSub:2'])).toEqual([
      { key: 'addSub:2', weight: rules.newTopicWeight * rules.weakTopicWeight },
    ]);
  });

  it('boosts fresh unlocks and weak topics', () => {
    const s = state({
      rounds: 6,
      topics: {
        addSub: {
          window: [false, true, false, false],
          streak: -2,
          tier: 2,
          unlockedAtRound: 0,
        },
        word: { window: [], streak: 0, tier: 1, unlockedAtRound: 5 },
      },
    });
    const plan = practicePlan(s, rules, pools);
    expect(plan).toContainEqual({ key: 'addSub:2', weight: rules.weakTopicWeight });
    expect(plan).toContainEqual({ key: 'word:1', weight: rules.newTopicWeight });
  });
});
