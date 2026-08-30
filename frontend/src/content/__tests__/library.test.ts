/**
 * The library over the packs that actually ship, so these assert against
 * real content rather than a fixture that agrees with the code.
 */

import { Grade } from '../contract';
import { Library, passageOf, storyQuestions } from '../library';
import { seedLibrary } from '../testLibrary';
import { SEED_PACKS } from '../seed';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const shuffle = <T,>(a: T[]): T[] => [...a];

describe('the bundled content', () => {
  const library = seedLibrary();

  it('has a full map for every grade in all three subjects', () => {
    for (const grade of GRADES) {
      expect(library.lessons(grade).length).toBeGreaterThan(0);
      expect(library.stories(grade).length).toBeGreaterThan(0);
      expect(library.puzzleSets(grade).length).toBeGreaterThan(0);
    }
  });

  it('carries the reward rules', () => {
    expect(library.rules?.coinRates.correct).toBeGreaterThan(0);
    expect(library.rules?.entryShare[3]).toBeGreaterThan(library.rules!.entryShare[1]);
  });

  it('knows it is running on bundled content', () => {
    library.lessons(1);
    expect(library.seedOnly).toBe(true);
  });

  it('fills every maths lesson to its stated length', () => {
    for (const grade of GRADES) {
      for (const lesson of library.lessons(grade)) {
        const { questions } = library.lessonQuestions(lesson, {}, Math.random);
        expect(questions).toHaveLength(lesson.questionCount + lesson.drawCount);
      }
    }
  });

  it('fills every logic set to its stated length', () => {
    for (const grade of GRADES) {
      for (const set of library.puzzleSets(grade)) {
        const { questions } = library.puzzleQuestions(set, {}, Math.random);
        expect(questions).toHaveLength(set.questionCount);
      }
    }
  });

  it('gives free practice the count it asked for', () => {
    for (const count of [5, 10, 15]) {
      const { questions } = library.practiceQuestions(3, 2, count, {}, Math.random);
      expect(questions).toHaveLength(count);
    }
  });

  it('intersects an unlock ladder with the pools the grade actually has', () => {
    const order = ['fractions', 'addSub', 'imaginary', 'word'];
    const topics = library.availableTopics('math', 3, order);
    // Ladder order is kept; a topic the grade has no pool for is dropped.
    expect(topics).not.toContain('imaginary');
    expect(topics.indexOf('addSub')).toBeLessThan(topics.indexOf('word'));
    for (const topic of topics) {
      expect(library.practicePools('math', 3).some((k) => k.startsWith(`${topic}:`))).toBe(true);
    }
  });

  it('lists logic families as practice pools too', () => {
    expect(library.practicePools('logic', 3).length).toBeGreaterThan(0);
  });

  it('draws weighted practice in proportion to the weights', () => {
    const picks = [
      { key: 'addSub:2', weight: 3 },
      { key: 'word:2', weight: 1 },
    ];
    const { questions } = library.weightedPractice('math', 3, picks, 2, 4, {}, Math.random);
    expect(questions).toHaveLength(4);
    const bySums = questions.filter((q) => q.id.includes(':addSub:')).length;
    const byWords = questions.filter((q) => q.id.includes(':word:')).length;
    // 3 of the 4 non-draw picks go to the heavy pool... but 4 >= 5 is false,
    // so no cake question joins and the split is exactly 3 and 1.
    expect(bySums).toBe(3);
    expect(byWords).toBe(1);
  });

  it('keeps the one cake question in a full-size weighted round', () => {
    const picks = [{ key: 'addSub:2', weight: 1 }];
    const { questions } = library.weightedPractice('math', 3, picks, 2, 10, {}, Math.random);
    expect(questions).toHaveLength(10);
    expect(questions.filter((q) => q.mode === 'draw')).toHaveLength(1);
  });

  it('advances cursors on weighted draws rather than replaying them', () => {
    const picks = [{ key: 'addSub:2', weight: 1 }];
    const first = library.weightedPractice('math', 3, picks, 2, 4, {}, Math.random);
    const second = library.weightedPractice('math', 3, picks, 2, 4, first.cursors, Math.random);
    const firstIds = new Set(first.questions.map((q) => q.id));
    expect(second.questions.some((q) => firstIds.has(q.id))).toBe(false);
  });

  it('draws nothing rather than throwing when no planned pool exists', () => {
    const picks = [{ key: 'imaginary:2', weight: 2 }];
    const { questions } = library.weightedPractice('math', 3, picks, 2, 10, {}, Math.random);
    expect(questions).toHaveLength(0);
  });

  it('spreads a multi-topic lesson across all of its topics', () => {
    const lesson = library.lessons(5).find((l) => l.focus.length >= 3);
    expect(lesson).toBeDefined();

    const { cursors } = library.lessonQuestions(lesson!, {}, Math.random);
    // The cursors name exactly which pools were drawn from, so this asserts
    // the spread directly rather than inferring it from the questions.
    const touched = Object.keys(cursors).filter((k) => !k.includes('/draw:'));
    expect(touched).toHaveLength(lesson!.focus.length);
    for (const topic of lesson!.focus) {
      expect(touched).toContain(`math.g5/${topic}:${lesson!.tier}`);
    }
  });

  it('draws the cake puzzles a lesson asks for on top of its questions', () => {
    const lesson = library.lessons(1).find((l) => l.drawCount > 0);
    expect(lesson).toBeDefined();

    const { questions } = library.lessonQuestions(lesson!, {}, Math.random);
    const drawn = questions.filter((q) => q.mode === 'draw');
    expect(drawn).toHaveLength(lesson!.drawCount);
    for (const q of drawn) expect(q.cakeTask).toBeDefined();
  });

  it('advances the cursors it is given rather than replaying the same draw', () => {
    const lesson = library.lessons(2)[0];
    const first = library.lessonQuestions(lesson, {}, Math.random);
    const second = library.lessonQuestions(lesson, first.cursors, Math.random);

    const overlap = second.questions.filter((q) =>
      first.questions.some((p) => p.id === q.id),
    );
    // Pools are far deeper than one lesson, so a walk should not double back.
    expect(overlap).toEqual([]);
  });

  it('prunes cursors for pools that no longer exist', () => {
    library.lessons(1);
    const pruned = library.pruneCursors({
      'math.g1/retired:1': { order: [0], taken: 1, size: 1 },
    });
    expect(pruned).toEqual({});
  });
});

describe('falling back', () => {
  it('uses the bundled pack when the downloaded one is corrupt', () => {
    const library = new Library(
      (id) => (id === 'math.g1' ? { kind: 'math', schemaVersion: 999 } : null),
      (id) => SEED_PACKS[id] ?? null,
    );
    // A bad publish costs freshness, not the grade.
    expect(library.lessons(1).length).toBeGreaterThan(0);
  });

  it('returns an empty map rather than throwing when a pack is missing entirely', () => {
    const library = new Library(() => null, () => null);
    expect(library.lessons(1)).toEqual([]);
    expect(library.stories(1)).toEqual([]);
    expect(library.puzzleSets(1)).toEqual([]);
    expect(library.rules).toBeNull();
  });

  it('draws nothing rather than throwing when the pools are gone', () => {
    const library = new Library(() => null, () => null);
    const lesson = { id: 'x', grade: 1 as const, index: 1, title: '', icon: '', tier: 1 as const, focus: ['addSub' as const], questionCount: 5, drawCount: 0 };
    expect(library.lessonQuestions(lesson, {}, Math.random).questions).toEqual([]);
  });

  it('prefers the downloaded pack when it is good', () => {
    const downloaded = {
      kind: 'math',
      schemaVersion: 1,
      version: 9,
      grade: 1,
      catalog: [
        { id: 'g1-l1', grade: 1, index: 1, title: 'Fresh', icon: '➕', tier: 1, focus: ['addSub'], questionCount: 1, drawCount: 0 },
      ],
      pools: {
        'addSub:1': [
          { id: 'n1', prompt: 'fresh question', correctAnswer: '4', choices: ['3', '4', '5', '6'], explanation: 'x', answerFormat: 'integer', mode: 'choice' },
        ],
      },
    };
    const library = new Library(
      (id) => (id === 'math.g1' ? downloaded : null),
      (id) => SEED_PACKS[id] ?? null,
    );
    expect(library.lessons(1)[0].title).toBe('Fresh');
    expect(library.seedOnly).toBe(false);
  });
});

describe('story questions', () => {
  const library = seedLibrary();

  it('turns an authored story into quiz questions the screens can render', () => {
    const story = library.stories(1)[0];
    const questions = storyQuestions(story, shuffle);

    expect(questions).toHaveLength(story.questions.length);
    for (const q of questions) {
      expect(q.mode).toBe('choice');
      // Comprehension answers are phrases, so they are never typed.
      expect(q.answerFormat).toBeNull();
      expect(q.choices).toHaveLength(4);
      expect(q.choices).toContain(q.correctAnswer);
    }
  });

  it('keeps the authored order, because the questions walk the paragraph', () => {
    const story = library.stories(2)[0];
    expect(storyQuestions(story, shuffle).map((q) => q.prompt)).toEqual(
      story.questions.map((q) => q.prompt),
    );
  });

  it('namespaces question ids by story, so history cannot collide', () => {
    const story = library.stories(3)[0];
    for (const q of storyQuestions(story, shuffle)) {
      expect(q.id.startsWith(`${story.id}-`)).toBe(true);
    }
  });

  it('keeps the passage for the screen to show alongside the questions', () => {
    const story = library.stories(1)[0];
    expect(passageOf(story)).toEqual({
      title: story.title,
      icon: story.icon,
      text: story.text,
    });
  });
});
