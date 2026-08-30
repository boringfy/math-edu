import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import App from '../../App';
import { seedLibrary } from '../content/testLibrary';
import { DEFAULT_ADAPTIVE, topicOfId } from '../lib/adaptive';
import { COIN_RATES, dayKey, freshDaily } from '../lib/progress';

import { Question, QuizResult, Subject } from '../types';

/** The content the app plays from in tests: the packs bundled in the binary. */
const LIB = seedLibrary();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The real provider renders nothing until it has measured the window insets,
// which never happens off-device.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

/** Renders the app and waits for the stored progress to load. */
async function launch(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<App />);
  });
  await flush();
  return tree;
}

function textOf(tree: ReactTestRenderer): string {
  const walk = (node: unknown): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(walk).join('');
    if (node && typeof node === 'object' && 'children' in node) {
      return `${walk((node as { children: unknown }).children)} `;
    }
    return '';
  };
  return walk(tree.toJSON());
}

/** The first node whose props match, e.g. the number pad or the cake board. */
const nodeWithProp = (tree: ReactTestRenderer, prop: string) =>
  tree.root.findAll((n) => typeof n.type !== 'string' && n.props[prop] !== undefined)[0];

/** Taps the button a child would find by that name on screen. */
const press = async (tree: ReactTestRenderer, label: string) => {
  const button = tree.root.find(
    (n) => typeof n.type !== 'string' && n.props.accessibilityLabel === label,
  );
  await act(async () => {
    button.props.onPress();
  });
  await flush();
};

/** Taps a lesson node on the map. */
const openLesson = async (tree: ReactTestRenderer, index: number) => {
  const map = nodeWithProp(tree, 'onStart');
  await act(async () => {
    map.props.onStart(LIB.lessons(1)[index]);
  });
  await flush();
};

/** Taps one of the tabs at the bottom of the home screen. */
const switchTo = async (tree: ReactTestRenderer, subject: Subject) => {
  const tabs = nodeWithProp(tree, 'onSelect');
  await act(async () => {
    tabs.props.onSelect(subject);
  });
  await flush();
};

/** Taps a story node, then the button that ends the reading phase. */
const openStory = async (tree: ReactTestRenderer, index: number) => {
  const map = nodeWithProp(tree, 'onStart');
  await act(async () => {
    map.props.onStart(LIB.stories(1)[index]);
  });
  await flush();
  // Past the story itself, on to its questions. The quit button also sits on
  // this screen, so the read button is found by name rather than by order.
  const read = tree.root.findAll(
    (n) =>
      typeof n.type !== 'string' &&
      n.props.onPress !== undefined &&
      n.props.accessibilityLabel === undefined,
  )[0];
  await act(async () => {
    read.props.onPress();
  });
  await flush();
};

/**
 * Answers the questions in order, the way a player would: tapping a choice,
 * typing on the number pad, or cutting the cake, whichever the question asks
 * for. QuizScreen walks its questions in order, so index i is on screen on
 * step i.
 */
async function answerAllCorrectly(tree: ReactTestRenderer, questions: Question[]) {
  for (const question of questions) {
    if (question.mode === 'draw') {
      const board = nodeWithProp(tree, 'task');
      await act(async () => {
        board.props.onSubmit(question.cakeTask!.pieces);
      });
    } else if (question.mode === 'entry') {
      await act(async () => {
        nodeWithProp(tree, 'format').props.onChange(question.correctAnswer);
      });
      await flush();
      await act(async () => {
        nodeWithProp(tree, 'format').props.onSubmit();
      });
    } else {
      const button = tree.root
        .findAll((n) => typeof n.type !== 'string' && n.props.label !== undefined)
        .find((n) => n.props.label === question.correctAnswer);
      await act(async () => {
        button!.props.onPress();
      });
    }
    await flush();
  }
}

/** Gets every question wrong, so the lesson fails and needs the fix round. */
async function answerAllWronglyOnce(tree: ReactTestRenderer, question: Question) {
  if (question.mode === 'draw') {
    const board = nodeWithProp(tree, 'task');
    await act(async () => {
      board.props.onSubmit(question.cakeTask!.pieces + 1);
    });
  } else if (question.mode === 'entry') {
    await act(async () => {
      nodeWithProp(tree, 'format').props.onChange('999999');
    });
    await flush();
    await act(async () => {
      nodeWithProp(tree, 'format').props.onSubmit();
    });
  } else {
    const button = tree.root
      .findAll((n) => typeof n.type !== 'string' && n.props.label !== undefined)
      .find((n) => n.props.label !== question.correctAnswer);
    await act(async () => {
      button!.props.onPress();
    });
  }
  await flush();
}

async function answerAllWrongly(tree: ReactTestRenderer, questions: Question[]) {
  for (const question of questions) {
    await answerAllWronglyOnce(tree, question);
  }
}

/** Taps the innermost pressable whose on-screen text contains the words. */
const pressByText = async (tree: ReactTestRenderer, needle: string) => {
  const textIn = (n: unknown): string => {
    if (typeof n === 'string') return n;
    const kids = (n as { children?: unknown[] }).children ?? [];
    return kids.map(textIn).join(' ');
  };
  const candidates = tree.root
    .findAll((n) => typeof n.type !== 'string' && n.props.onPress !== undefined)
    .filter((n) => textIn(n).includes(needle));
  await act(async () => {
    candidates[candidates.length - 1].props.onPress();
  });
  await flush();
};

/** Opens the free-practice card on the current tab and starts a round. */
const startPractice = async (tree: ReactTestRenderer) => {
  await pressByText(tree, 'Free practice');
  await pressByText(tree, 'Start practice');
  return nodeWithProp(tree, 'questions').props.questions as Question[];
};

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});
afterEach(() => jest.useRealTimers());

/**
 * A key belonging to whoever is playing.
 *
 * Progress is stored per child now, so a test that set something up on the
 * old un-prefixed keys is reading back from the profile the migration
 * carried it into.
 */
const kidKey = async (name: string): Promise<string> => {
  const raw = await AsyncStorage.getItem('mathquiz:profiles');
  const activeId = raw ? (JSON.parse(raw) as { activeId: string }).activeId : '';
  return activeId === '' ? `mathquiz:${name}` : `mathquiz:p:${activeId}:${name}`;
};

describe('paying for the next lesson', () => {
  /**
   * The behaviour this replaced: a lesson for sale used to show a coin, and
   * pressing it bought the lesson and left you looking at a START you then
   * had to press again. What a lesson costs is a fact about it, not a
   * separate thing to do.
   */
  it('pays and opens the lesson in one press', async () => {
    await AsyncStorage.setItem('mathquiz:coins', '100');
    await AsyncStorage.setItem(
      'mathquiz:lessons',
      JSON.stringify({
        'g1-l1': { stars: 3, bestPercent: 100, clearedAt: '2026-08-01T00:00:00.000Z' },
      }),
    );

    const tree = await launch();
    const second = LIB.lessons(1)[1];
    await press(tree, `Play ${second.title} for 18 coins`);

    // Straight into the quiz, with the price taken.
    expect(nodeWithProp(tree, 'questions')).toBeTruthy();
    expect(Number(await AsyncStorage.getItem(await kidKey('coins')))).toBe(82);
    const bought = JSON.parse((await AsyncStorage.getItem(await kidKey('unlocks'))) ?? '{}');
    expect(bought.math).toEqual([second.id]);
  });

  it('takes nothing for a lesson already bought', async () => {
    await AsyncStorage.setItem('mathquiz:coins', '100');
    await AsyncStorage.setItem(
      'mathquiz:lessons',
      JSON.stringify({
        'g1-l1': { stars: 3, bestPercent: 100, clearedAt: '2026-08-01T00:00:00.000Z' },
      }),
    );
    const second = LIB.lessons(1)[1];
    await AsyncStorage.setItem(
      'mathquiz:unlocks',
      JSON.stringify({ math: [second.id], reading: [], logic: [] }),
    );

    const tree = await launch();
    await press(tree, `Play ${second.title}`);
    expect(Number(await AsyncStorage.getItem(await kidKey('coins')))).toBe(100);
  });

  /** Replaying to earn the coins back must never cost anything. */
  it('takes nothing to replay a lesson already passed', async () => {
    await AsyncStorage.setItem('mathquiz:coins', '20');
    await AsyncStorage.setItem(
      'mathquiz:lessons',
      JSON.stringify({
        'g1-l1': { stars: 1, bestPercent: 60, clearedAt: '2026-08-01T00:00:00.000Z' },
      }),
    );

    const tree = await launch();
    await press(tree, `Play ${LIB.lessons(1)[0].title}`);
    expect(nodeWithProp(tree, 'questions')).toBeTruthy();
    expect(Number(await AsyncStorage.getItem(await kidKey('coins')))).toBe(20);
  });
});

describe('adaptive free practice', () => {
  it('starts with the starter types and unlocks a new one on a perfect round', async () => {
    // Grade 3, because grade 1 packs only bake the starter topics — there a
    // perfect round correctly has nothing left to unlock.
    await AsyncStorage.setItem(
      'mathquiz:grades',
      JSON.stringify({ math: 3, reading: 1, logic: 1 }),
    );
    const tree = await launch();
    const questions = await startPractice(tree);
    expect(questions).toHaveLength(10);

    // Every pooled question comes from the starter set, nothing beyond it.
    const starters = LIB
      .availableTopics('math', 3, DEFAULT_ADAPTIVE.unlockOrder.math)
      .slice(0, DEFAULT_ADAPTIVE.starterCount.math);
    for (const q of questions) {
      const topic = topicOfId(q.id);
      if (topic !== null) expect(starters).toContain(topic);
    }

    await answerAllCorrectly(tree, questions);
    expect(textOf(tree)).toContain('New question type unlocked');

    const stored = JSON.parse((await AsyncStorage.getItem(await kidKey('adaptive'))) ?? '{}');
    expect(stored['math:3'].unlocked).toHaveLength(starters.length + 1);
  });

  it('makes the topics a child is struggling with easier next time', async () => {
    const tree = await launch();
    const questions = await startPractice(tree);
    await answerAllWrongly(tree, questions);

    const results = textOf(tree);
    expect(results).toContain('easier');

    // Every topic that was asked about has stepped down to the gentlest tier,
    // and the legacy per-grade dial followed it down.
    const stored = JSON.parse((await AsyncStorage.getItem(await kidKey('adaptive'))) ?? '{}');
    const tiers = Object.values(stored['math:1'].topics as Record<string, { tier: number }>);
    expect(tiers.length).toBeGreaterThan(0);
    expect(tiers.every((t) => t.tier === 1)).toBe(true);
    expect(await AsyncStorage.getItem(await kidKey('tier:1'))).toBe('1');
  });

  it('carries what it learned across a restart instead of starting over', async () => {
    const first = await launch();
    await answerAllCorrectly(first, await startPractice(first));
    const afterOne = JSON.parse((await AsyncStorage.getItem(await kidKey('adaptive'))) ?? '{}');
    expect(afterOne['math:1'].rounds).toBe(1);

    // A fresh launch reads the stored state rather than seeding a new one.
    const second = await launch();
    await answerAllCorrectly(second, await startPractice(second));
    const afterTwo = JSON.parse((await AsyncStorage.getItem(await kidKey('adaptive'))) ?? '{}');
    expect(afterTwo['math:1'].rounds).toBe(2);
  });

  it('plays a logic practice round without touching the math dial', async () => {
    const tree = await launch();
    await switchTo(tree, 'logic');
    const questions = await startPractice(tree);
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.id).toContain('/logic.');
    }

    await answerAllCorrectly(tree, questions);
    expect(textOf(tree)).toContain('Quiz complete');

    const stored = JSON.parse((await AsyncStorage.getItem(await kidKey('adaptive'))) ?? '{}');
    expect(stored['logic:1']).toBeDefined();
    expect(stored['math:1']).toBeUndefined();
    // Logic never writes the legacy per-grade math tier.
    expect(await AsyncStorage.getItem(await kidKey('tier:1'))).toBeNull();
  });
});

describe('playing a lesson end to end', () => {
  it('banks coins, awards stars and opens the next lesson', async () => {
    const tree = await launch();
    expect(textOf(tree)).toContain('🪙 0');

    await openLesson(tree, 0);

    // Answer the questions the session actually generated, however each asks.
    const questions = nodeWithProp(tree, 'questions').props.questions as Question[];
    await answerAllCorrectly(tree, questions);

    const results = textOf(tree);
    expect(results).toContain('★★★');
    expect(results).toContain('Perfect lesson');
    expect(results).toContain('First time cleared');

    // Coins: every answer, the streak, the clean run and the first clear.
    const stored = Number(await AsyncStorage.getItem(await kidKey('coins')));
    expect(stored).toBeGreaterThanOrEqual(
      questions.length * COIN_RATES.correct + COIN_RATES.perfect + COIN_RATES.firstClear,
    );

    // The lesson is recorded at three stars...
    const progress = JSON.parse((await AsyncStorage.getItem(await kidKey('lessons'))) ?? '{}');
    expect(progress['g1-l1'].stars).toBe(3);

    // ...and the map now shows lesson 2 as the one to play.
    const home = tree.root.findAll(
      (n) => typeof n.type !== 'string' && n.props.onHome !== undefined,
    )[0];
    await act(async () => {
      home.props.onHome();
    });
    await flush();
    expect(textOf(tree)).toContain(LIB.lessons(1)[1].title);
  });

  it('gives up a lesson without saving anything, back to the map', async () => {
    const tree = await launch();
    await openLesson(tree, 0);

    // A couple of answers in, the child has had enough.
    const questions = nodeWithProp(tree, 'questions').props.questions as Question[];
    await answerAllCorrectly(tree, questions.slice(0, 1));

    await press(tree, 'Quit quiz');
    await press(tree, 'Give up');

    // Back on the map, with the lesson still waiting to be played...
    const home = textOf(tree);
    expect(home).toContain(LIB.lessons(1)[0].title);
    expect(home).toContain('START');
    // ...and nothing banked: no stars, no result in the history, no coins.
    expect(await AsyncStorage.getItem(await kidKey('lessons'))).toBeNull();
    expect(await AsyncStorage.getItem(await kidKey('history'))).toBeNull();
    expect(await AsyncStorage.getItem(await kidKey('coins'))).toBeNull();
  });

  it('leaves a failed lesson shut, then lets practice rescue it to one star', async () => {
    const tree = await launch();
    await openLesson(tree, 0);

    const questions = nodeWithProp(tree, 'questions').props.questions as Question[];
    await answerAllWrongly(tree, questions);

    expect(textOf(tree)).toContain('Fix your');
    let progress = JSON.parse((await AsyncStorage.getItem(await kidKey('lessons'))) ?? '{}');
    expect(progress['g1-l1'].stars).toBe(0);

    // Into the correction round, and fix every one of them.
    await act(async () => {
      nodeWithProp(tree, 'onFixMistakes').props.onFixMistakes();
    });
    await flush();
    const correction = nodeWithProp(tree, 'onDone');
    await act(async () => {
      correction.props.onDone(
        (correction.props.questions as Question[]).map((q) => ({
          questionId: q.id,
          attempts: 1,
          fixed: true,
          skipped: false,
        })),
      );
    });
    await flush();

    // Practice pays for the fixes and opens the next lesson, but only to one
    // star — two and three stay reserved for a clean first run.
    progress = JSON.parse((await AsyncStorage.getItem(await kidKey('lessons'))) ?? '{}');
    expect(progress['g1-l1'].stars).toBe(1);
    expect(Number(await AsyncStorage.getItem(await kidKey('coins')))).toBeGreaterThanOrEqual(
      questions.length * COIN_RATES.fixed,
    );
  });

  it('carries the coin purse and the day\'s progress across a restart', async () => {
    await AsyncStorage.setItem('mathquiz:coins', '250');
    await AsyncStorage.setItem(
      'mathquiz:daily',
      JSON.stringify({ ...freshDaily(dayKey(new Date())), progress: { correct15: 4 } }),
    );

    const tree = await launch();
    expect(textOf(tree)).toContain('🪙 250');
  });

  it('keeps the reading map, and its progress, apart from the math map', async () => {
    const tree = await launch();
    await switchTo(tree, 'reading');

    const story = LIB.stories(1)[0];
    expect(textOf(tree)).toContain(story.title);

    await openStory(tree, 0);
    // The story stays on screen while its questions are answered.
    expect(textOf(tree)).toContain(story.text);
    await answerAllCorrectly(tree, nodeWithProp(tree, 'questions').props.questions as Question[]);

    const results = textOf(tree);
    expect(results).toContain('★★★');
    expect(results).toContain(`Story 1: ${story.title}`);

    // Stars land on the reading map only — the math map is untouched.
    const reading = JSON.parse((await AsyncStorage.getItem(await kidKey('stories'))) ?? '{}');
    expect(reading['g1-r1'].stars).toBe(3);
    expect(await AsyncStorage.getItem(await kidKey('lessons'))).toBeNull();

    // The result is filed under reading, so it shows on that tab alone.
    const history = JSON.parse((await AsyncStorage.getItem(await kidKey('history'))) ?? '[]');
    expect(history.map((r: QuizResult) => r.subject)).toEqual(['reading']);
    expect(history[0].stopId).toBe('g1-r1');
  });

  it('leaves the story on screen while a missed question is fixed', async () => {
    const tree = await launch();
    await switchTo(tree, 'reading');
    await openStory(tree, 0);

    const questions = nodeWithProp(tree, 'questions').props.questions as Question[];
    await answerAllWrongly(tree, questions);
    await act(async () => {
      nodeWithProp(tree, 'onFixMistakes').props.onFixMistakes();
    });
    await flush();

    expect(textOf(tree)).toContain('Fix your mistakes');
    expect(textOf(tree)).toContain(LIB.stories(1)[0].text);
  });

  it('keeps the logic map, and its progress, apart from the other two', async () => {
    const tree = await launch();
    await switchTo(tree, 'logic');

    const set = LIB.puzzleSets(1)[0];
    expect(textOf(tree)).toContain(set.title);

    const map = nodeWithProp(tree, 'onStart');
    await act(async () => {
      map.props.onStart(set);
    });
    await flush();

    const questions = nodeWithProp(tree, 'questions').props.questions as Question[];
    expect(questions).toHaveLength(set.questionCount);
    // This set is all drawn puzzles, so every answer is a picture.
    expect(questions.every((q) => q.puzzle !== undefined)).toBe(true);
    await answerAllCorrectly(tree, questions);

    const results = textOf(tree);
    expect(results).toContain('★★★');
    expect(results).toContain(`Puzzles 1: ${set.title}`);

    // Stars land on the logic map alone.
    const logic = JSON.parse((await AsyncStorage.getItem(await kidKey('puzzles'))) ?? '{}');
    expect(logic['g1-p1'].stars).toBe(3);
    expect(await AsyncStorage.getItem(await kidKey('lessons'))).toBeNull();
    expect(await AsyncStorage.getItem(await kidKey('stories'))).toBeNull();

    const history = JSON.parse((await AsyncStorage.getItem(await kidKey('history'))) ?? '[]');
    expect(history.map((r: QuizResult) => r.subject)).toEqual(['logic']);
    expect(history[0].stopId).toBe('g1-p1');
  });

  it('starts a new set of challenges when the stored day is stale', async () => {
    await AsyncStorage.setItem(
      'mathquiz:daily',
      JSON.stringify({
        date: '2020-01-01',
        challengeIds: ['finishLesson'],
        progress: { finishLesson: 1 },
        claimed: ['finishLesson'],
      }),
    );

    await launch();

    const stored = JSON.parse((await AsyncStorage.getItem(await kidKey('daily'))) ?? '{}');
    expect(stored.date).toBe(dayKey(new Date()));
    expect(stored.progress).toEqual({});
    expect(stored.claimed).toEqual([]);
  });
});
