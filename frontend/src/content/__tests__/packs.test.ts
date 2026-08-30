/**
 * Validation is the app's only defence. There is no generator left to fall
 * back on, so whatever survives this file is what a child is shown.
 *
 * The behaviour that matters most is the asymmetry: a pack the app cannot
 * read at all is refused, but a pack containing a few questions it cannot
 * draw loses only those questions. That is what lets the server start
 * shipping a new question type to newer builds without breaking older ones.
 */

import { SCHEMA_VERSION } from '../contract';
import { decodePack, validQuestion } from '../packs';

const question = (over: Record<string, unknown> = {}) => ({
  id: 'q1',
  prompt: '2 + 2',
  correctAnswer: '4',
  choices: ['3', '4', '5', '6'],
  explanation: '2 and 2 is 4.',
  answerFormat: 'integer',
  mode: 'choice',
  ...over,
});

const mathPack = (over: Record<string, unknown> = {}) => ({
  kind: 'math',
  schemaVersion: SCHEMA_VERSION,
  version: 3,
  grade: 1,
  catalog: [
    {
      id: 'g1-l1',
      grade: 1,
      index: 1,
      title: 'Adding',
      icon: '➕',
      tier: 1,
      focus: ['addSub'],
      questionCount: 5,
      drawCount: 0,
    },
  ],
  pools: { 'addSub:1': [question()] },
  ...over,
});

describe('validQuestion', () => {
  it('accepts an ordinary question', () => {
    expect(validQuestion(question())).not.toBeNull();
  });

  it('drops a mode this build has never heard of', () => {
    // The point of the whole exercise: content for a newer app is ignored,
    // not rendered as a blank screen.
    expect(validQuestion(question({ mode: 'holographic' }))).toBeNull();
  });

  it('drops a question whose choices do not contain the answer', () => {
    expect(validQuestion(question({ choices: ['1', '2', '3', '9'] }))).toBeNull();
  });

  it('drops a question with missing text', () => {
    expect(validQuestion(question({ explanation: undefined }))).toBeNull();
    expect(validQuestion(question({ prompt: 42 }))).toBeNull();
  });

  it('drops an answerFormat it cannot type', () => {
    expect(validQuestion(question({ answerFormat: 'roman-numeral' }))).toBeNull();
  });

  it('requires a cake task on a drawing question and choices on the rest', () => {
    expect(validQuestion(question({ mode: 'draw', choices: [] }))).toBeNull();
    expect(
      validQuestion(
        question({ mode: 'draw', choices: [], cakeTask: { cuts: 3, pieces: 6, hint: 'middle' } }),
      ),
    ).not.toBeNull();
  });

  it('drops a puzzle using a tile type this build cannot draw', () => {
    const puzzle = {
      stimulus: [{ type: 'hologram', spin: 3 }],
      columns: 1,
      options: {},
    };
    expect(validQuestion(question({ puzzle }))).toBeNull();
  });

  it('drops a grid tile whose cell count does not match its size', () => {
    const puzzle = {
      stimulus: [{ type: 'grid', size: 3, cells: [true, false] }],
      columns: 1,
      options: {},
    };
    expect(validQuestion(question({ puzzle }))).toBeNull();
  });

  it('accepts a well-formed grid tile', () => {
    const puzzle = {
      stimulus: [{ type: 'grid', size: 2, cells: [true, false, false, true] }],
      columns: 1,
      options: {},
    };
    expect(validQuestion(question({ puzzle }))).not.toBeNull();
  });
});

describe('decodePack', () => {
  it('decodes a good pack', () => {
    const { pack, dropped } = decodePack(mathPack());
    expect(pack?.kind).toBe('math');
    expect(dropped).toBe(0);
  });

  it('refuses a pack from a schema version it does not know', () => {
    const { pack, reason } = decodePack(mathPack({ schemaVersion: SCHEMA_VERSION + 1 }));
    expect(pack).toBeNull();
    expect(reason).toContain('schema');
  });

  it('refuses anything that is not a pack at all', () => {
    expect(decodePack(null).pack).toBeNull();
    expect(decodePack('nonsense').pack).toBeNull();
    expect(decodePack({ kind: 'weather', schemaVersion: SCHEMA_VERSION }).pack).toBeNull();
  });

  it('keeps the readable questions and counts the rest as dropped', () => {
    const { pack, dropped } = decodePack(
      mathPack({
        pools: {
          'addSub:1': [question(), question({ id: 'q2', mode: 'holographic' }), question({ id: 'q3' })],
        },
      }),
    );
    expect(dropped).toBe(1);
    expect(pack?.kind === 'math' && pack.pools['addSub:1']).toHaveLength(2);
  });

  it('drops a pool that has been emptied entirely, but keeps the pack', () => {
    const { pack } = decodePack(
      mathPack({
        pools: {
          'addSub:1': [question()],
          'future:1': [question({ mode: 'holographic' })],
        },
      }),
    );
    expect(pack?.kind === 'math' && Object.keys(pack.pools)).toEqual(['addSub:1']);
  });

  it('refuses a pack whose pools are all unreadable', () => {
    const { pack, reason } = decodePack(
      mathPack({ pools: { 'addSub:1': [question({ mode: 'holographic' })] } }),
    );
    expect(pack).toBeNull();
    expect(reason).toBe('no usable pools');
  });

  it('refuses a pack with an empty catalog', () => {
    expect(decodePack(mathPack({ catalog: [] })).pack).toBeNull();
  });

  it('drops malformed stops from a catalog', () => {
    const { pack } = decodePack(
      mathPack({
        catalog: [...mathPack().catalog, { id: 'broken', grade: 1 }],
      }),
    );
    expect(pack?.kind === 'math' && pack.catalog).toHaveLength(1);
  });

  it('ignores a version in the body, because the manifest owns versions', () => {
    // Keeping the number out of the decoded pack is what lets the bake tell
    // "this content changed" apart from "this content was published again".
    const { pack } = decodePack(mathPack({ version: 99 }));
    expect(pack).not.toBeNull();
    expect(pack as unknown as Record<string, unknown>).not.toHaveProperty('version');
  });
});

describe('decodePack for reading', () => {
  const story = {
    id: 'g1-r1',
    grade: 1,
    index: 1,
    title: 'The Boat',
    icon: '⛵',
    tier: 1,
    text: 'Sam folded a paper boat.',
    questions: [
      {
        id: 'q1',
        prompt: 'What did Sam fold?',
        answer: 'A boat',
        distractors: ['A hat', 'A plane', 'A cup'],
        explanation: 'The first sentence says so.',
        skill: 'detail',
      },
    ],
  };

  it('decodes a story pack', () => {
    const { pack } = decodePack({
      kind: 'reading',
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      grade: 1,
      catalog: [story],
    });
    expect(pack?.kind === 'reading' && pack.catalog).toHaveLength(1);
  });

  it('drops a story with no questions and refuses an empty catalog', () => {
    const { pack } = decodePack({
      kind: 'reading',
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      grade: 1,
      catalog: [{ ...story, questions: [] }],
    });
    expect(pack).toBeNull();
  });
});

describe('decodePack for rules', () => {
  const rules = {
    coinRates: { correct: 2, fixed: 1, comboMilestone: 3, perfect: 10, firstClear: 5 },
    firstCombo: 3,
    challengeBuckets: [
      [{ id: 'a', title: 'A', icon: '🎓', target: 1, reward: 15, metric: 'lessonsCleared', mode: 'sum' }],
    ],
    entryShare: { 1: 0.25, 2: 0.5, 3: 0.75 },
    starThresholds: { three: 100, two: 80, one: 50 },
  };

  const wrap = (over: Record<string, unknown> = {}) => ({
    kind: 'rules',
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    rules: { ...rules, ...over },
  });

  it('decodes good rules', () => {
    const { pack } = decodePack(wrap());
    expect(pack?.kind === 'rules' && pack.rules.coinRates.correct).toBe(2);
  });

  it('refuses rules with a non-numeric coin rate, rather than paying out NaN', () => {
    expect(decodePack(wrap({ coinRates: { ...rules.coinRates, correct: 'lots' } })).pack).toBeNull();
  });

  it('refuses rules missing a tier from entryShare', () => {
    expect(decodePack(wrap({ entryShare: { 1: 0.25, 2: 0.5 } })).pack).toBeNull();
  });

  it('refuses a bucket it cannot read, rather than a day with two challenges', () => {
    expect(decodePack(wrap({ challengeBuckets: [[{ id: 'a' }]] })).pack).toBeNull();
  });

  describe('the adaptive block', () => {
    const adaptive = {
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
      unlockOrder: { math: ['addSub'], logic: ['series'] },
    };

    it('decodes a good adaptive block', () => {
      const { pack } = decodePack(wrap({ adaptive }));
      expect(pack?.kind === 'rules' && pack.rules.adaptive?.unlockAfter).toBe(2);
    });

    it('keeps the pack when the block is absent — older packs predate it', () => {
      const { pack } = decodePack(wrap());
      expect(pack).not.toBeNull();
      expect(pack?.kind === 'rules' && pack.rules.adaptive).toBeUndefined();
    });

    it('drops a malformed block but never the pack over it', () => {
      const { pack } = decodePack(wrap({ adaptive: { ...adaptive, unlockOrder: { math: [] } } }));
      expect(pack).not.toBeNull();
      expect(pack?.kind === 'rules' && pack.rules.adaptive).toBeUndefined();
    });
  });
});
