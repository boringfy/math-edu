import { ScrollView } from 'react-native';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import ChoiceButton from '../../components/ChoiceButton';
import ComboBurst from '../../components/ComboBurst';
import DailyChallenges from '../../components/DailyChallenges';
import MapTrail from '../../components/MapTrail';
import PuzzleTile from '../../components/PuzzleTile';
import ScratchPad from '../../components/ScratchPad';
import StoryPassage from '../../components/StoryPassage';
import SubjectTabs from '../../components/SubjectTabs';
import { seedLibrary } from '../../content/testLibrary';
import { passageOf, storyQuestions } from '../../content';
import { shuffle } from '../../lib/grading';
import { freshDaily, lessonAward } from '../../lib/progress';


import { AnswerRecord, DEFAULT_SETTINGS, Lesson, ProgressMap, Subject } from '../../types';
import CorrectionScreen from '../CorrectionScreen';
import HomeScreen from '../HomeScreen';
import QuizScreen from '../QuizScreen';
import ResultsScreen from '../ResultsScreen';
import SettingsScreen from '../SettingsScreen';

/** The content the screens are rendered against: the bundled packs. */
const LIB = seedLibrary();

/** Renders a tree and returns it, failing the test on any render error. */
function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(element);
  });
  return tree;
}

/**
 * Every string rendered anywhere in the tree, for content assertions.
 * Children are joined without a separator so that interpolated text such as
 * `+{total} coins` reads back exactly as it appears on screen.
 */
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

/** Text with all its spacing removed, for comparing across element splits. */
const squash = (text: string) => text.replace(/\s+/g, '');

/** A lesson's questions, all as multiple choice so a test can tap answers. */
const tappableQuestions = (lesson: Lesson) =>
  LIB.lessonQuestions(lesson, {}, Math.random).questions
    .filter((q) => q.mode !== 'draw')
    .map((q) => ({ ...q, mode: 'choice' as const }));

const daily = freshDaily('2026-08-02');
const noProgress: ProgressMap = {};

/** The props both home tabs share, so a test only states what it varies. */
const homeProps = (subject: Subject) => ({
  subject,
  library: LIB,
  history: [],
  grade: 1 as const,
  onGradeChange: () => {},
  tiers: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 } as const,
  coins: 137,
  daily,
  progress: noProgress,
  onStartLesson: () => {},
  onStartStory: () => {},
  onStartPuzzles: () => {},
  onStartPractice: () => {},
  onOpenSettings: () => {},
});

/** The lesson map's meta lines, which MapTrail leaves to its caller. */
const lessonMeta = (lesson: Lesson): [string, string] => [
  lesson.focus.join(' · '),
  `${lesson.questionCount} questions`,
];

// The combo burst animates on timers; without this they outlive the test run.
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('HomeScreen', () => {
  it('renders the map, the coin purse and the day\'s challenges', () => {
    const text = textOf(render(<HomeScreen {...homeProps('math')} />));
    expect(text).toContain('137');
    expect(text).toContain("Today's challenges");
    // Grade 1 opens on its first lesson.
    expect(text).toContain(LIB.lessons(1)[0].title);
    expect(text).toContain('START');
  });

  it('opens the map at the stop the child is on, not back at the top', () => {
    const cleared = { stars: 3 as const, bestPercent: 100, clearedAt: '2026-08-01T00:00:00.000Z' };
    const progress: ProgressMap = { 'g1-l1': cleared, 'g1-l2': cleared, 'g1-l3': cleared };
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});

    const tree = render(<HomeScreen {...homeProps('math')} progress={progress} />);
    const measured = measuredViews(tree);
    layoutAt(measured[0], 300);
    layoutAt(measured[1], 620);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0][0]).toEqual({ y: 790, animated: false });

    // A later measurement of the same map must not yank the screen about
    // while the child is reading further down it.
    layoutAt(measured[1], 640);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    scrollTo.mockRestore();
  });

  it('shows the story map and no free practice on the reading tab', () => {
    const text = textOf(render(<HomeScreen {...homeProps('reading')} />));
    expect(text).toContain('📖 Boring Quest');
    expect(text).toContain(LIB.stories(1)[0].title);
    expect(text).not.toContain('Free practice');
    // The purse is one purse, shared by both subjects.
    expect(text).toContain('137');
  });

  it('keeps each tab to its own history', () => {
    const result = {
      id: 'r1',
      date: '2026-08-02T00:00:00.000Z',
      grade: 1 as const,
      tier: 2 as const,
      total: 4,
      correctCount: 4,
      fixedCount: 0,
      skippedCount: 0,
      elapsedMs: 30_000,
    };
    const history = [
      { ...result, subject: 'reading' as const, id: 'r-read', elapsedMs: 31_000 },
      { ...result, subject: 'math' as const, id: 'r-math', elapsedMs: 62_000 },
    ];

    /** Opens the folded history section and returns everything on screen. */
    const openHistory = (subject: Subject, label: string) => {
      const tree = render(<HomeScreen {...homeProps(subject)} history={history} />);
      // Folded away until asked for, so the map keeps the screen.
      expect(textOf(tree)).not.toContain('1:02');
      expect(textOf(tree)).not.toContain('0:31');
      const header = tree.root.find(
        (n) => typeof n.type !== 'string' && n.props.accessibilityLabel === label,
      );
      act(() => {
        header.props.onPress();
      });
      return textOf(tree);
    };

    expect(openHistory('math', 'Past quizzes')).toContain('1:02');
    expect(openHistory('reading', 'Past reads')).toContain('0:31');
  });

  it('shows the puzzle map on the logic tab', () => {
    const text = textOf(render(<HomeScreen {...homeProps('logic')} />));
    expect(text).toContain('🧩 Boring Quest');
    expect(text).toContain(LIB.puzzleSets(1)[0].title);
    expect(text).toContain('puzzles get trickier as you go');
    expect(text).not.toContain('Free practice');
  });
});

/**
 * Every tappable in a tree, in order, minus the quiz's quit button — which
 * sits first on screen but is never the thing a test means to tap.
 */
const buttons = (tree: ReactTestRenderer) =>
  tree.root.findAll(
    (n) =>
      typeof n.type !== 'string' &&
      n.props.onPress !== undefined &&
      n.props.accessibilityLabel !== 'Quit quiz',
  );

/** Taps the button a child would find by that name on screen. */
const press = (tree: ReactTestRenderer, label: string) =>
  act(() => {
    tree.root
      .find((n) => typeof n.type !== 'string' && n.props.accessibilityLabel === label)
      .props.onPress();
  });

/** Every layout callback in a tree, in the order the views appear. */
const measuredViews = (tree: ReactTestRenderer) =>
  tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props.onLayout === 'function');

/** Feeds a view its measurements, as the layout pass would on a device. */
const layoutAt = (node: ReactTestInstance, y: number) =>
  act(() => {
    node.props.onLayout({ nativeEvent: { layout: { x: 0, y, width: 300, height: 0 } } });
  });

describe('MapTrail', () => {
  it('marks cleared stops with stars and leaves later ones locked', () => {
    const progress: ProgressMap = {
      'g1-l1': { stars: 2, bestPercent: 85, clearedAt: '2026-08-01T00:00:00.000Z' },
    };
    const tree = render(
      <MapTrail stops={LIB.lessons(1)} progress={progress} meta={lessonMeta} onStart={() => {}} />,
    );
    const text = textOf(tree);
    expect(text).toContain('★');
    // Lesson 3 is still shut, so it shows a padlock rather than its icon.
    expect(text).toContain('🔒');
  });

  it('starts a stop when its node is pressed', () => {
    const started: Lesson[] = [];
    const tree = render(
      <MapTrail
        stops={LIB.lessons(2)}
        progress={noProgress}
        meta={lessonMeta}
        onStart={(l) => started.push(l)}
      />,
    );
    const pressables = tree.root.findAll(
      (n) => typeof n.type !== 'string' && n.props.onPress !== undefined,
    );
    act(() => {
      pressables[0].props.onPress();
    });
    expect(started).toHaveLength(1);
    expect(started[0].id).toBe('g2-l1');
  });

  it('reports where the current stop sits once it has been laid out', () => {
    const cleared = { stars: 3 as const, bestPercent: 100, clearedAt: '2026-08-01T00:00:00.000Z' };
    const progress: ProgressMap = {
      'g1-l1': cleared,
      'g1-l2': cleared,
      'g1-l3': cleared,
    };
    const offsets: number[] = [];
    const tree = render(
      <MapTrail
        stops={LIB.lessons(1)}
        progress={progress}
        meta={lessonMeta}
        onStart={() => {}}
        onCurrentOffset={(y) => offsets.push(y)}
      />,
    );

    // Only the trail itself and the current stop measure themselves.
    const measured = measuredViews(tree);
    expect(measured).toHaveLength(2);

    // Neither measurement is enough on its own; together they place stop 4.
    layoutAt(measured[0], 40);
    layoutAt(measured[1], 620);
    expect(offsets).toEqual([660]);
  });
});

describe('SubjectTabs', () => {
  it('switches to the tab that was tapped', () => {
    const picked: Subject[] = [];
    const tree = render(<SubjectTabs subject="math" onSelect={(s) => picked.push(s)} />);
    const tabs = tree.root.findAll(
      (n) => typeof n.type !== 'string' && n.props.onPress !== undefined,
    );
    act(() => {
      tabs[1].props.onPress();
      tabs[2].props.onPress();
    });
    expect(picked).toEqual(['reading', 'logic']);
  });
});

describe('StoryPassage', () => {
  it('shows the story by default and folds it away when tapped', () => {
    const passage = passageOf(LIB.stories(1)[0]);
    const tree = render(<StoryPassage passage={passage} />);
    expect(textOf(tree)).toContain(passage.text);

    const header = tree.root.findAll(
      (n) => typeof n.type !== 'string' && n.props.onPress !== undefined,
    )[0];
    act(() => {
      header.props.onPress();
    });
    expect(textOf(tree)).not.toContain(passage.text);
    expect(textOf(tree)).toContain('Read again');
  });
});

describe('DailyChallenges', () => {
  it('shows progress against each target', () => {
    const inProgress = { ...daily, progress: { [daily.challengeIds[0]]: 1 } };
    expect(textOf(render(<DailyChallenges daily={inProgress} />))).toContain('1 /');
  });
});

describe('ComboBurst', () => {
  it('stays out of the way until a streak fires', () => {
    expect(render(<ComboBurst combo={0} nonce={0} />).toJSON()).toBeNull();
    expect(textOf(render(<ComboBurst combo={5} nonce={1} />))).toContain('5 in a row!');
  });
});

describe('QuizScreen', () => {
  it('walks through a lesson and reports the best streak', () => {
    const questions = tappableQuestions(LIB.lessons(1)[0]);
    let done: { records: AnswerRecord[]; combo: number } | null = null;

    const tree = render(
      <QuizScreen
        grade={1}
        scratchPaper
        penOnly={false}
        subject="math"
        questions={questions}
        onComplete={(records, _ms, bestCombo) => {
          done = { records, combo: bestCombo };
        }}
        onQuit={() => {}}
      />,
    );

    // Answer every question correctly by tapping the right choice.
    for (const question of questions) {
      const button = tree.root
        .findAll((n) => typeof n.type !== 'string' && n.props.label !== undefined)
        .find((n) => n.props.label === question.correctAnswer);
      act(() => {
        button!.props.onPress();
      });
    }

    expect(done).not.toBeNull();
    expect(done!.records).toHaveLength(questions.length);
    expect(done!.records.every((r) => r.correct)).toBe(true);
    expect(done!.combo).toBe(questions.length);
  });

  it('shows a reading story first, then keeps it beside every question', () => {
    const story = LIB.stories(2)[0];
    const questions = storyQuestions(story, shuffle);
    let done: AnswerRecord[] | null = null;

    const tree = render(
      <QuizScreen
        grade={1}
        scratchPaper
        penOnly={false}
        subject="reading"
        questions={questions}
        passage={passageOf(story)}
        onComplete={(records) => {
          done = records;
        }}
        onQuit={() => {}}
      />,
    );

    // The story comes first, on its own, with no question in sight. It is
    // drawn one word at a time so reading aloud can highlight them, so the
    // spacing between the spans is an artefact of textOf rather than the
    // screen — compare the words alone.
    expect(squash(textOf(tree))).toContain(squash(story.text));
    expect(textOf(tree)).not.toContain(questions[0].prompt);

    const start = buttons(tree)[0];
    act(() => {
      start.props.onPress();
    });

    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(0);

    for (const question of questions) {
      // The story is still there to look back at while answering.
      expect(textOf(tree)).toContain(story.text);
      const button = tree.root
        .findAll((n) => typeof n.type !== 'string' && n.props.label !== undefined)
        .find((n) => n.props.label === question.correctAnswer);
      act(() => {
        button!.props.onPress();
      });
    }

    expect(done).not.toBeNull();
    expect(done!).toHaveLength(questions.length);
    expect(done!.every((r) => r.correct)).toBe(true);
  });

  it('draws a logic puzzle and its four answers, and marks the right one', () => {
    // A set built purely of drawn puzzles, so every question has tiles.
    const set = LIB.puzzleSets(1)[0];
    const questions = LIB.puzzleQuestions(set, {}, Math.random).questions;
    let done: AnswerRecord[] | null = null;

    const tree = render(
      <QuizScreen
        grade={1}
        scratchPaper
        penOnly={false}
        subject="logic"
        questions={questions}
        onComplete={(records) => {
          done = records;
        }}
        onQuit={() => {}}
      />,
    );

    // A pattern is spotted, not worked out: no scrap paper on this tab.
    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(0);

    for (const question of questions) {
      expect(question.puzzle).toBeDefined();
      // Four buttons, each carrying the tile its label stands for.
      const buttons = tree.root.findAllByType(ChoiceButton);
      expect(buttons).toHaveLength(4);
      for (const button of buttons) {
        expect(button.props.tile).toEqual(question.puzzle!.options[button.props.label]);
      }
      // The pattern itself is drawn above, gap included.
      expect(tree.root.findAllByType(PuzzleTile).length).toBeGreaterThan(4);

      act(() => {
        buttons.find((b) => b.props.label === question.correctAnswer)!.props.onPress();
      });
    }

    expect(done!.every((r) => r.correct)).toBe(true);
  });

  it('lays scratch paper out from the start of a maths round, and puts it away on request', () => {
    const questions = tappableQuestions(LIB.lessons(1)[0]);
    const tree = render(
      <QuizScreen grade={1} scratchPaper penOnly={false} subject="math" questions={questions} onComplete={() => {}} onQuit={() => {}} />,
    );

    // Out on the desk without being asked for.
    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(1);

    press(tree, 'Scratch paper');
    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(0);

    press(tree, 'Scratch paper');
    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(1);
  });

  it('offers no paper at all when it is switched off in settings', () => {
    const questions = tappableQuestions(LIB.lessons(1)[0]);
    const tree = render(
      <QuizScreen
        grade={1}
        scratchPaper={false}
        penOnly
        subject="math"
        questions={questions}
        onComplete={() => {}}
        onQuit={() => {}}
      />,
    );

    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(0);
    // And no pencil in the header offering to fetch it.
    expect(
      tree.root.findAll(
        (n) => typeof n.type !== 'string' && n.props.accessibilityLabel === 'Scratch paper',
      ),
    ).toHaveLength(0);
  });

  it('asks before giving up, and only then leaves the round', () => {
    const questions = tappableQuestions(LIB.lessons(1)[0]);
    let quit = 0;
    let completed = 0;
    const tree = render(
      <QuizScreen
        grade={1}
        scratchPaper
        penOnly={false}
        subject="math"
        questions={questions}
        onComplete={() => (completed += 1)}
        onQuit={() => (quit += 1)}
      />,
    );

    // Tapping the ✕ only asks, so a mistaken tap costs nothing.
    press(tree, 'Quit quiz');
    expect(textOf(tree)).toContain('Give up this round?');

    press(tree, 'Keep going');
    expect(textOf(tree)).not.toContain('Give up this round?');
    expect(quit).toBe(0);

    press(tree, 'Quit quiz');
    press(tree, 'Give up');
    expect(quit).toBe(1);
    // Giving up is not finishing: no answers are ever handed back.
    expect(completed).toBe(0);
  });
});

describe('CorrectionScreen', () => {
  const missed = () => tappableQuestions(LIB.lessons(1)[0]).slice(0, 2);

  const correction = (props: Partial<React.ComponentProps<typeof CorrectionScreen>> = {}) =>
    render(
      <CorrectionScreen
        subject="math"
        grade={1}
        scratchPaper
        penOnly={false}
        questions={missed()}
        onDone={() => {}}
        {...props}
      />,
    );

  it('brings the scratch paper to a second go at a sum', () => {
    const tree = correction();
    expect(textOf(tree)).toContain('Fix your mistakes');
    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(1);

    press(tree, 'Scratch paper');
    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(0);
  });

  it('leaves it out of a reading round and out of a switched-off one', () => {
    expect(correction({ subject: 'reading' }).root.findAllByType(ScratchPad)).toHaveLength(0);
    expect(correction({ scratchPaper: false }).root.findAllByType(ScratchPad)).toHaveLength(0);
  });
});

/** Everything SettingsScreen needs, with the grades a fresh install has. */
const settingsProps = () => ({
  settings: DEFAULT_SETTINGS,
  onChange: () => {},
  grades: { math: 1 as const, reading: 1 as const, logic: 1 as const },
  onGradeChange: () => {},
  onBack: () => {},
});

describe('SettingsScreen', () => {
  /** The switch a grown-up would reach for by that name. */
  const toggle = (tree: ReactTestRenderer, label: string) =>
    tree.root.find(
      (n) => typeof n.type !== 'string' && n.props.accessibilityLabel === label,
    );

  it('starts with scratch paper on and the pen required', () => {
    expect(DEFAULT_SETTINGS).toEqual({ scratchPaper: true, penOnly: true });
  });

  it('saves each switch as it is flipped', () => {
    let saved = DEFAULT_SETTINGS;
    const tree = render(
      <SettingsScreen {...settingsProps()} settings={saved} onChange={(next) => (saved = next)} />,
    );

    act(() => {
      toggle(tree, 'Pen only').props.onValueChange(false);
    });
    expect(saved).toEqual({ scratchPaper: true, penOnly: false });

    act(() => {
      toggle(tree, 'Scratch paper').props.onValueChange(false);
    });
    expect(saved.scratchPaper).toBe(false);
  });

  it('greys out the pen switch when there is no paper to draw on', () => {
    const tree = render(
      <SettingsScreen {...settingsProps()} settings={{ scratchPaper: false, penOnly: true }} />,
    );
    expect(toggle(tree, 'Pen only').props.disabled).toBe(true);
    expect(toggle(tree, 'Scratch paper').props.disabled).toBeUndefined();
  });

  it('goes back when asked', () => {
    let back = 0;
    const tree = render(
      <SettingsScreen {...settingsProps()} onBack={() => (back += 1)} />,
    );
    press(tree, 'Back');
    expect(back).toBe(1);
  });
});

describe('ResultsScreen', () => {
  it('itemises the coins earned and celebrates three stars', () => {
    const questions = tappableQuestions(LIB.lessons(1)[0]);
    const records: AnswerRecord[] = questions.map((question) => ({
      question,
      chosen: question.correctAnswer,
      correct: true,
    }));
    const award = lessonAward({
      correctCount: records.length,
      total: records.length,
      bestCombo: records.length,
      firstClear: true,
    });

    const text = textOf(
      render(
        <ResultsScreen
          records={records}
          elapsedMs={62_000}
          tierChange={null}
          afterCorrection={false}
          subject="math"
          stop={LIB.lessons(1)[0]}
          stars={3}
          bestCombo={records.length}
          award={award}
          completedChallenges={[]}
          coinTotal={500}
          onFixMistakes={() => {}}
          onHome={() => {}}
        />,
      ),
    );

    expect(text).toContain(`+${award.total} coins`);
    expect(text).toContain('Perfect lesson');
    expect(text).toContain('First time cleared');
    expect(text).toContain('perfect lesson!');
    expect(text).toContain('500');
  });
});

describe('SettingsScreen content panel', () => {
  it('tells a grown-up where the questions come from and when they were checked', () => {
    const text = textOf(
      render(
        <SettingsScreen {...settingsProps()} />,
      ),
    );

    expect(text).toContain('Content');
    expect(text).toContain('Last checked');
    expect(text).toContain('Check now');
  });

  it('says so plainly when the app is running on the copy it shipped with', () => {
    // No content has been downloaded in the test environment, which is also
    // what a fresh install looks like.
    const text = textOf(
      render(
        <SettingsScreen {...settingsProps()} />,
      ),
    );
    expect(text).toContain('the copy that came with the app');
    expect(text).toContain('never');
  });
});

/**
 * The grade used to be a row of pills half way down the home screen, which
 * scrolled away the moment the map was touched. Nothing then said which
 * grade was showing, and a grade-4 map full of grade-1 sums just looks like
 * an easy day.
 */
describe('the grade in the header', () => {
  it('says which grade the map is, on every subject', () => {
    for (const subject of ['math', 'reading', 'logic'] as const) {
      const text = textOf(render(<HomeScreen {...homeProps(subject)} grade={4} />));
      expect(text).toContain('Grade 4');
    }
  });

  /**
   * Fixed by being outside the ScrollView rather than a sticky header inside
   * it. A sticky header is held in place with a transform, and on Android a
   * view translated out of its parent's bounds stops receiving touches — the
   * settings gear was visible but dead.
   */
  it('sits outside the scrolling area, so it cannot scroll away', () => {
    const tree = render(<HomeScreen {...homeProps('math')} />);
    const scroll = tree.root.findAllByType(ScrollView)[0];
    const insideScroll = scroll.findAll(
      (n) =>
        typeof n.type !== 'string' &&
        String(n.props.accessibilityLabel).startsWith('Grade '),
    );
    expect(insideScroll).toEqual([]);
  });

  it('keeps the settings gear tappable, header and all', () => {
    let opened = 0;
    const tree = render(
      <HomeScreen {...homeProps('math')} onOpenSettings={() => (opened += 1)} />,
    );
    const scroll = tree.root.findAllByType(ScrollView)[0];
    const gear = tree.root.find(
      (n) => typeof n.type !== 'string' && n.props.accessibilityLabel === 'Settings',
    );
    // Outside the scroller, so nothing can translate it out of reach.
    expect(scroll.findAll((n) => n === gear)).toEqual([]);
    act(() => gear.props.onPress());
    expect(opened).toBe(1);
  });

  it('no longer offers the picker on the map itself', () => {
    // It lives in settings now; the map is the child's, not a grown-up's.
    const tree = render(<HomeScreen {...homeProps('math')} />);
    const pickers = tree.root.findAll(
      (n) => typeof n.type !== 'string' && /^Grade \d+$/.test(String(n.props.accessibilityLabel)),
    );
    expect(pickers).toEqual([]);
  });

  it('leads to where the grade is actually set', () => {
    let opened = 0;
    const tree = render(
      <HomeScreen {...homeProps('math')} onOpenSettings={() => (opened += 1)} />,
    );
    act(() =>
      tree.root
        .find(
          (n) =>
            typeof n.type !== 'string' &&
            String(n.props.accessibilityLabel).startsWith('Grade 1.'),
        )
        .props.onPress(),
    );
    expect(opened).toBe(1);
  });
});

describe('the grade picker in settings', () => {
  it('offers each subject its own grade', () => {
    const tree = render(
      <SettingsScreen
        {...settingsProps()}
        grades={{ math: 2, reading: 5, logic: 1 }}
      />,
    );
    const text = textOf(tree);
    expect(text).toContain('Maths');
    expect(text).toContain('Reading');
    expect(text).toContain('Logic');

    // Each row shows its own subject's grade as the chosen one.
    const chosen = (label: string) =>
      tree.root.find(
        (n) =>
          typeof n.type !== 'string' &&
          n.props.accessibilityLabel === label &&
          n.props.accessibilityState?.selected === true,
      );
    expect(chosen('Maths grade 2')).toBeTruthy();
    expect(chosen('Reading grade 5')).toBeTruthy();
    expect(chosen('Logic grade 1')).toBeTruthy();
  });

  it('reports which subject was changed, not just the number', () => {
    const changes: [string, number][] = [];
    const tree = render(
      <SettingsScreen
        {...settingsProps()}
        onGradeChange={(subject, grade) => changes.push([subject, grade])}
      />,
    );
    act(() =>
      tree.root
        .find(
          (n) => typeof n.type !== 'string' && n.props.accessibilityLabel === 'Reading grade 3',
        )
        .props.onPress(),
    );
    expect(changes).toEqual([['reading', 3]]);
  });

  it('changing one subject leaves the others alone', () => {
    // The reducer lives in App, so this pins the contract the screen offers:
    // it names the subject, and says nothing about the rest.
    const changes: [string, number][] = [];
    const tree = render(
      <SettingsScreen
        {...settingsProps()}
        grades={{ math: 2, reading: 5, logic: 1 }}
        onGradeChange={(subject, grade) => changes.push([subject, grade])}
      />,
    );
    act(() =>
      tree.root
        .find((n) => typeof n.type !== 'string' && n.props.accessibilityLabel === 'Logic grade 4')
        .props.onPress(),
    );
    expect(changes).toEqual([['logic', 4]]);
  });
});

