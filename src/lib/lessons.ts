import { Grade, Lesson, ProgressMap, Question, TopicKey } from '../types';
import {
  currentStop,
  isUnlocked as isStopUnlocked,
  starsEarned as starsOnMap,
} from './mapProgress';
import { generateFocusedQuiz } from './questions';

/**
 * The fixed map for each grade. Lessons run left to right in difficulty: the
 * first third sits on the easy tier, the middle third on normal and the last
 * third on hard, and the subject moves around so a grade isn't sixty rounds
 * of the same thing.
 *
 * A lesson's tier comes from where it sits rather than from the spec, so the
 * map re-bands itself when lessons are added and can never dip backwards.
 *
 * Positions are fixed on purpose — progress is stored against the lesson id,
 * so lessons can be retitled but never renumbered or reordered. The twelve
 * hand-written lessons that opened each grade therefore stay first in it.
 */
interface LessonSpec {
  title: string;
  icon: string;
  focus: TopicKey[];
  questionCount: number;
  /** Cake puzzles on top of the question count. Defaults to 1 from 6 up. */
  draw?: number;
}

const OPENING: Record<Grade, LessonSpec[]> = {
  1: [
    { title: 'Adding to 10', icon: '🍎', focus: ['addSub'], questionCount: 6, draw: 0 },
    { title: 'Taking Away', icon: '🧺', focus: ['addSub'], questionCount: 6, draw: 0 },
    { title: 'Shape Spotting', icon: '🔺', focus: ['geometry'], questionCount: 6 },
    { title: 'Story Corner', icon: '📖', focus: ['word'], questionCount: 6 },
    { title: 'Missing Numbers', icon: '❓', focus: ['addSub'], questionCount: 7 },
    { title: 'Cake Cutting', icon: '🎂', focus: ['addSub'], questionCount: 4, draw: 2 },
    { title: 'Adding to 20', icon: '➕', focus: ['addSub'], questionCount: 7 },
    { title: 'Shapes & Stories', icon: '🧩', focus: ['geometry', 'word'], questionCount: 7 },
    { title: 'Mixed Practice', icon: '🎯', focus: ['addSub', 'word', 'geometry'], questionCount: 8 },
    { title: 'Bigger Sums', icon: '🚀', focus: ['addSub'], questionCount: 8 },
    { title: 'Puzzle Party', icon: '🎪', focus: ['word', 'geometry'], questionCount: 6, draw: 2 },
    { title: 'Grade 1 Champion', icon: '🏆', focus: ['addSub', 'word', 'geometry'], questionCount: 10 },
  ],
  2: [
    { title: 'Sums to 50', icon: '➕', focus: ['addSub'], questionCount: 6, draw: 0 },
    { title: 'Take Away Time', icon: '➖', focus: ['addSub'], questionCount: 6, draw: 0 },
    { title: 'Times Tables Start', icon: '✖️', focus: ['mulDiv'], questionCount: 6 },
    { title: 'Coins & Change', icon: '🪙', focus: ['money'], questionCount: 6 },
    { title: 'Measuring Up', icon: '📏', focus: ['measurement'], questionCount: 6 },
    { title: 'Story Problems', icon: '📖', focus: ['word'], questionCount: 7 },
    { title: 'Sides & Corners', icon: '🔷', focus: ['geometry'], questionCount: 7 },
    { title: 'Tables Practice', icon: '✖️', focus: ['mulDiv'], questionCount: 7 },
    { title: 'Sums to 100', icon: '💯', focus: ['addSub'], questionCount: 8 },
    { title: 'Cake Cutting', icon: '🎂', focus: ['mulDiv'], questionCount: 5, draw: 2 },
    { title: 'Money & Measure', icon: '🛒', focus: ['money', 'measurement'], questionCount: 8 },
    { title: 'Grade 2 Champion', icon: '🏆', focus: ['addSub', 'mulDiv', 'word', 'geometry'], questionCount: 10 },
  ],
  3: [
    { title: 'Multiply & Divide', icon: '✖️', focus: ['mulDiv'], questionCount: 6, draw: 0 },
    { title: 'Big Sums', icon: '➕', focus: ['addSub'], questionCount: 6, draw: 0 },
    { title: 'Sharing Equally', icon: '🍪', focus: ['word'], questionCount: 6 },
    { title: 'Perimeter & Area', icon: '📐', focus: ['geometry'], questionCount: 7 },
    { title: 'Length & Litres', icon: '📏', focus: ['measurement'], questionCount: 7 },
    { title: 'Shopping Money', icon: '🛒', focus: ['money'], questionCount: 7 },
    { title: 'Speed & Distance', icon: '🚗', focus: ['speed'], questionCount: 6 },
    { title: 'Tables Master', icon: '✖️', focus: ['mulDiv'], questionCount: 8 },
    { title: 'Cake Cutting', icon: '🎂', focus: ['word'], questionCount: 5, draw: 2 },
    { title: 'Word Problem Mix', icon: '📖', focus: ['word', 'money'], questionCount: 8 },
    { title: 'Measure & Shape', icon: '📐', focus: ['geometry', 'measurement'], questionCount: 8 },
    { title: 'Grade 3 Champion', icon: '🏆', focus: ['mulDiv', 'addSub', 'word', 'geometry'], questionCount: 10 },
  ],
  4: [
    { title: 'Long Multiplication', icon: '✖️', focus: ['mulDiv'], questionCount: 6, draw: 0 },
    { title: 'Division Drills', icon: '➗', focus: ['mulDiv'], questionCount: 6, draw: 0 },
    { title: 'Multi-digit Sums', icon: '➕', focus: ['addSub'], questionCount: 7 },
    { title: 'First Fractions', icon: '🍕', focus: ['fractions'], questionCount: 6 },
    { title: 'Area & Perimeter', icon: '📐', focus: ['geometry'], questionCount: 7 },
    { title: 'Units & Capacity', icon: '📏', focus: ['measurement'], questionCount: 7 },
    { title: 'Money Budgets', icon: '💰', focus: ['money'], questionCount: 7 },
    { title: 'Speed & Time', icon: '🚗', focus: ['speed'], questionCount: 6 },
    { title: 'Fraction Practice', icon: '🍕', focus: ['fractions', 'word'], questionCount: 7 },
    { title: 'Cake Cutting', icon: '🎂', focus: ['geometry'], questionCount: 5, draw: 2 },
    { title: 'Angles & Volume', icon: '🧊', focus: ['geometry', 'measurement'], questionCount: 8 },
    { title: 'Grade 4 Champion', icon: '🏆', focus: ['mulDiv', 'fractions', 'word', 'geometry'], questionCount: 10 },
  ],
  5: [
    { title: 'Decimal Adding', icon: '🔢', focus: ['decimals'], questionCount: 6, draw: 0 },
    { title: 'Decimal Multiplying', icon: '✖️', focus: ['decimals'], questionCount: 6, draw: 0 },
    { title: 'Order of Operations', icon: '🧮', focus: ['order'], questionCount: 7 },
    { title: 'Comparing Fractions', icon: '🍕', focus: ['fractions'], questionCount: 6 },
    { title: 'Percent & Averages', icon: '📊', focus: ['word'], questionCount: 7 },
    { title: 'Angles & Triangles', icon: '📐', focus: ['geometry'], questionCount: 7 },
    { title: 'Big Multiplication', icon: '✖️', focus: ['mulDiv'], questionCount: 7 },
    { title: 'Conversions', icon: '📏', focus: ['measurement'], questionCount: 7 },
    { title: 'Money & Budgets', icon: '💰', focus: ['money'], questionCount: 7 },
    { title: 'Speed Challenge', icon: '🚗', focus: ['speed'], questionCount: 7 },
    { title: 'Cake Cutting', icon: '🎂', focus: ['order'], questionCount: 5, draw: 2 },
    { title: 'Grade 5 Champion', icon: '🏆', focus: ['decimals', 'fractions', 'order', 'word', 'geometry'], questionCount: 10 },
  ],
};

/** How many lessons each grade offers, openers included. */
const LESSONS_PER_GRADE_TARGET = 60;

/**
 * What each grade can actually be asked about. These mirror the pools in
 * `questions.ts` exactly: a topic listed here is guaranteed to have
 * generators at every tier, which is what lets a lesson be built for a grade
 * without checking first.
 */
const TOPICS: Record<Grade, TopicKey[]> = {
  1: ['addSub', 'word', 'geometry'],
  2: ['addSub', 'mulDiv', 'money', 'measurement', 'word', 'geometry'],
  3: ['mulDiv', 'addSub', 'word', 'geometry', 'measurement', 'money', 'speed'],
  4: ['mulDiv', 'fractions', 'addSub', 'geometry', 'measurement', 'money', 'speed', 'word'],
  5: [
    'decimals',
    'fractions',
    'order',
    'mulDiv',
    'addSub',
    'geometry',
    'measurement',
    'money',
    'speed',
    'word',
  ],
};

/** Names a drill can take, cycled so a grade doesn't repeat itself. */
const TITLES: Record<TopicKey, string[]> = {
  addSub: ['Sums Practice', 'Adding On', 'Taking Away', 'Number Bonds', 'Quick Sums', 'Missing Numbers'],
  mulDiv: ['Times Tables', 'Sharing Out', 'Multiply Drill', 'Division Drill', 'Groups & Rows', 'Factor Hunt'],
  fractions: ['Fraction Practice', 'Parts of a Whole', 'Comparing Fractions', 'Fraction Drill'],
  decimals: ['Decimal Practice', 'Places & Points', 'Comparing Decimals', 'Decimal Drill'],
  order: ['Order of Operations', 'Brackets First', 'Which Comes First', 'Operation Order'],
  word: ['Story Problems', 'Word Puzzles', 'Real-life Maths', 'Think It Through', 'Problem Solving'],
  geometry: ['Shape Work', 'Sides & Corners', 'Area Practice', 'Shape Hunt', 'Perimeter Practice'],
  measurement: ['Measuring Up', 'Length & Litres', 'Units Practice', 'Weights & Measures'],
  money: ['Money Maths', 'Shopping Trip', 'Coins & Change', 'Budget Practice'],
  speed: ['Speed & Distance', 'Journey Maths', 'Time & Travel', 'How Far, How Fast'],
};

const ICONS: Record<TopicKey, string> = {
  addSub: '➕',
  mulDiv: '✖️',
  fractions: '🍕',
  decimals: '🔟',
  order: '🧮',
  word: '📖',
  geometry: '📐',
  measurement: '📏',
  money: '🪙',
  speed: '🚗',
};

/** Short labels, for naming a lesson that covers more than one topic. */
const SHORT: Record<TopicKey, string> = {
  addSub: 'Sums',
  mulDiv: 'Tables',
  fractions: 'Fractions',
  decimals: 'Decimals',
  order: 'Order',
  word: 'Stories',
  geometry: 'Shapes',
  measurement: 'Measures',
  money: 'Money',
  speed: 'Speed',
};

const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII'];

/** "Sums, Shapes & Money" rather than three ampersands in a row. */
const listTitle = (parts: string[]): string =>
  parts.length < 2
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;

/**
 * Fills a grade's map out to its full length.
 *
 * The questions themselves are generated at play time, so what is built here
 * is only the shape of each stop: which topics it draws on, how many
 * questions it asks and whether it ends with a cake to cut. The shape widens
 * as the map goes on — single-topic drills first, then pairs, then lessons
 * that mix three subjects and cannot be passed by remembering one method.
 */
function fillOut(grade: Grade, openers: LessonSpec[]): LessonSpec[] {
  const topics = TOPICS[grade];
  const lessons: LessonSpec[] = [];
  const used = new Map<string, number>();

  /** Keeps titles distinct without inventing nonsense words for them. */
  const name = (base: string): string => {
    const seen = (used.get(base) ?? 0) + 1;
    used.set(base, seen);
    return `${base}${ROMAN[Math.min(seen - 1, ROMAN.length - 1)]}`;
  };

  for (const spec of openers) name(spec.title);

  for (let i = openers.length; i < LESSONS_PER_GRADE_TARGET - 1; i++) {
    const share = i / LESSONS_PER_GRADE_TARGET;
    const first = topics[i % topics.length];

    // Two topics from the halfway mark, three from three-quarters on.
    const width = share < 0.45 ? 1 : share < 0.75 ? 2 : 3;
    const focus = Array.from(
      { length: width },
      (_, k) => topics[(i + k * (1 + (i % 3))) % topics.length],
    ).filter((t, k, all) => all.indexOf(t) === k);

    const titles = TITLES[first];
    const base =
      focus.length === 1
        ? titles[Math.floor(i / topics.length) % titles.length]
        : listTitle(focus.map((t) => SHORT[t]));

    // Every twelfth stop is a cutting lesson, which is a change of pace as
    // much as a topic.
    const cake = i % 12 === 11;
    lessons.push({
      title: cake ? name('Cake Cutting') : name(base),
      icon: cake ? '🎂' : ICONS[first],
      focus,
      questionCount: cake ? 5 : 6 + Math.floor(share * 4),
      draw: cake ? 2 : focus.length === 1 ? 0 : undefined,
    });
  }

  lessons.push({
    title: `Grade ${grade} Master`,
    icon: '👑',
    focus: topics.slice(0, 5),
    questionCount: 10,
  });
  return lessons;
}

const CURRICULUM: Record<Grade, LessonSpec[]> = {
  1: [...OPENING[1], ...fillOut(1, OPENING[1])],
  2: [...OPENING[2], ...fillOut(2, OPENING[2])],
  3: [...OPENING[3], ...fillOut(3, OPENING[3])],
  4: [...OPENING[4], ...fillOut(4, OPENING[4])],
  5: [...OPENING[5], ...fillOut(5, OPENING[5])],
};

/** Cake puzzles are worth one question each, so short lessons skip them. */
const DEFAULT_DRAW_FROM = 6;

/** Each grade's map is split into three difficulty bands of equal length. */
const tierForIndex = (i: number, count: number): 1 | 2 | 3 =>
  i < Math.ceil(count / 3) ? 1 : i < Math.ceil((count * 2) / 3) ? 2 : 3;

function build(grade: Grade, spec: LessonSpec, i: number, count: number): Lesson {
  return {
    id: `g${grade}-l${i + 1}`,
    grade,
    index: i + 1,
    title: spec.title,
    icon: spec.icon,
    focus: spec.focus,
    tier: tierForIndex(i, count),
    questionCount: spec.questionCount,
    drawCount: spec.draw ?? (spec.questionCount >= DEFAULT_DRAW_FROM ? 1 : 0),
  };
}

const shelve = (grade: Grade): Lesson[] =>
  CURRICULUM[grade].map((s, i) => build(grade, s, i, CURRICULUM[grade].length));

export const LESSONS: Record<Grade, Lesson[]> = {
  1: shelve(1),
  2: shelve(2),
  3: shelve(3),
  4: shelve(4),
  5: shelve(5),
};

export const LESSONS_PER_GRADE = LESSONS[1].length;

/** Total questions asked, cake puzzles included. */
export const lessonLength = (lesson: Lesson): number =>
  lesson.questionCount + lesson.drawCount;

export function generateLesson(lesson: Lesson): Question[] {
  return generateFocusedQuiz(
    lesson.grade,
    lesson.tier,
    lesson.questionCount,
    lesson.focus,
    lesson.drawCount,
  );
}

/** A lesson is open once the one before it has been passed. */
export const isUnlocked = (lesson: Lesson, progress: ProgressMap): boolean =>
  isStopUnlocked(LESSONS[lesson.grade], lesson, progress);

/** The furthest lesson the player can actually play, for the "Start" marker. */
export const currentLesson = (grade: Grade, progress: ProgressMap): Lesson =>
  currentStop(LESSONS[grade], progress) as Lesson;

export const starsEarned = (grade: Grade, progress: ProgressMap): number =>
  starsOnMap(LESSONS[grade], progress);
