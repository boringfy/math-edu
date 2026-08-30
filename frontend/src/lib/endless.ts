/**
 * The map past the end of the authored one.
 *
 * The sixty authored lessons per grade are levels 1 to 6. Level 7 onward is
 * composed from the factory catalog on the device, ten lessons at a time, and
 * dressed as ordinary `Lesson`s so the map, the quiz and the results screen
 * cannot tell the difference.
 *
 * Nothing about a composed lesson is stored. Its id says everything needed to
 * rebuild it — `math.g2.L7.l3` is subject, grade, level and position — and
 * composition is deterministic, so the lesson a child taps is the lesson they
 * get, this session or next. Progress is stored against that id exactly as it
 * is for an authored lesson, which is why the id format has to stay put.
 */

import {
  ComposedLesson,
  LESSONS_PER_LEVEL,
  Mastery,
  composeLevel,
  levelDifficulty,
  questionsFor,
} from '../content/factories/compose';
import { AdaptiveState } from './adaptive';
import { plannedLevel } from './levelPlans';
import { Grade, Lesson, MapStop, ProgressMap, Question, Subject } from '../types';

export type EndlessSubject = 'math' | 'logic';

/**
 * Which maps carry on past what was written.
 *
 * Both the ones with factories behind them. Reading is the exception by
 * design — a story is written, not generated — so its map is exactly as long
 * as its author made it.
 */
export const isEndless = (subject: Subject): subject is EndlessSubject =>
  subject === 'math' || subject === 'logic';


interface ComposedId {
  subject: EndlessSubject;
  grade: Grade;
  level: number;
  position: number;
}

export function parseComposedId(id: string): ComposedId | null {
  const match = /^(math|logic)\.g([1-5])\.L(\d+)\.l(\d+)$/.exec(id);
  if (!match) return null;
  return {
    subject: match[1] as EndlessSubject,
    grade: Number(match[2]) as Grade,
    level: Number(match[3]),
    position: Number(match[4]),
  };
}

/**
 * A composed lesson wearing the shape the rest of the app already reads.
 *
 * `Lesson` and `PuzzleSet` differ only in what their `focus` is a list of —
 * topics on one map, puzzle families on the other — and a composed stop
 * carries whichever its own subject uses. So one object serves as either, and
 * the cast is at the boundary rather than inside the map.
 */
function asStop(composed: ComposedLesson, grade: Grade): Lesson {
  const draws = composed.slots.filter((slot) => slot.factory === 'cakeCut').length;
  return {
    id: composed.id,
    grade,
    index: composed.index,
    title: composed.title,
    icon: composed.icon,
    tier: composed.tier,
    focus: composed.skills.filter((s) => s !== 'draw') as Lesson['focus'],
    questionCount: composed.slots.length - draws,
    drawCount: draws,
  };
}

/**
 * The lessons of one level.
 *
 * Levels inside the authored map are a slice of it; past that they are
 * composed. Either way it is ten lessons, so the screen above does not have
 * to know which side of the seam it is on.
 */
export function lessonsForLevel(opts: {
  subject: EndlessSubject;
  grade: Grade;
  level: number;
  /**
   * The written map this level continues. Typed loosely because both maps
   * use this and their stops differ in what `focus` lists; only the length
   * and the slice are read here.
   */
  authored: MapStop[];
  mastery?: Mastery;
}): Lesson[] {
  const { subject, grade, level, authored, mastery = {} } = opts;
  const written = authoredLevels(authored);

  if (level <= written) {
    const from = (level - 1) * LESSONS_PER_LEVEL;
    return authored.slice(from, from + LESSONS_PER_LEVEL) as Lesson[];
  }

  // A level the server planned is preferred, and is already checked against
  // the same catalog — see `levelPlans`. Composing is what happens when one
  // has not arrived, which is most of the time and always at first.
  const planned = plannedLevel(subject, grade, level);
  const lessons =
    planned?.lessons ??
    composeLevel({
      subject,
      grade,
      level,
      firstComposedLevel: written + 1,
      mastery,
    });
  return lessons.map((composed) => asStop(composed, grade));
}

/**
 * The problems a composed lesson asks, rebuilt from its id.
 *
 * Returns null for an authored lesson, which is the caller's signal to draw
 * from the baked pools instead.
 */
export function composedQuestions(
  lesson: MapStop,
  authoredCount: number,
  adaptive?: AdaptiveState,
): Question[] | null {
  const parsed = parseComposedId(lesson.id);
  if (!parsed) return null;

  // The same preference the map made, so the lesson a child tapped is the
  // lesson they get. Both read the one cache rather than each deciding.
  const planned = plannedLevel(parsed.subject, parsed.grade, parsed.level);
  const level =
    planned?.lessons ??
    composeLevel({
      subject: parsed.subject,
      grade: parsed.grade,
      level: parsed.level,
      firstComposedLevel: authoredLevels({ length: authoredCount }) + 1,
      mastery: masteryFor(adaptive, parsed.grade, parsed.level, authoredCount),
    });
  const composed = level[parsed.position - 1];
  return composed ? questionsFor(composed) : null;
}
export { LESSONS_PER_LEVEL };

/** Which level a lesson sits in. Lessons are numbered from one. */
export const levelOf = (lessonIndex: number): number =>
  Math.floor((lessonIndex - 1) / LESSONS_PER_LEVEL) + 1;

/** How many levels the authored map alone makes. */
export const authoredLevels = (authored: { length: number }): number =>
  Math.max(1, Math.ceil(authored.length / LESSONS_PER_LEVEL));

/**
 * The furthest level the child may open: the one holding the first lesson
 * they have not passed. On a map that ends, it stops at the end; on one that
 * does not, it keeps going, so finishing level 12 opens level 13.
 */
export function highestOpenLevel(
  subject: Subject,
  grade: Grade,
  authored: MapStop[],
  progress: ProgressMap,
): number {
  const unfinished = authored.find((stop) => (progress[stop.id]?.stars ?? 0) === 0);
  if (unfinished) return levelOf(unfinished.index);

  const last = authoredLevels(authored);
  if (!isEndless(subject)) return last;

  // Every authored lesson is passed, so walk on through the composed levels
  // until one has a lesson still to do. The ids come from the composer rather
  // than being spelled out here: writing them by hand is how this managed to
  // look only for maths ones, which left the logic map stuck for ever at the
  // first composed level.
  for (let level = last + 1; level < last + MAX_LOOKAHEAD; level++) {
    const lessons = lessonsForLevel({ subject, grade, level, authored });
    if (lessons.some((lesson) => (progress[lesson.id]?.stars ?? 0) === 0)) return level;
  }
  return last;
}

/**
 * How far ahead to look for the level a child is on. Only reached by someone
 * who has cleared every lesson before it, so the bound is a guard against a
 * corrupt progress map rather than a real limit.
 */
const MAX_LOOKAHEAD = 500;

/**
 * Every stop from lesson one to the end of `level`, composed where the
 * authored map has run out. The map needs the ones before the level it is
 * showing because unlocking looks at the lesson before.
 */
export function stopsUpTo(
  subject: Subject,
  grade: Grade,
  level: number,
  authored: MapStop[],
  adaptive?: AdaptiveState,
): MapStop[] {
  const last = authoredLevels(authored);
  if (!isEndless(subject) || level <= last) return authored;

  const composed: Lesson[] = [];
  for (let n = last + 1; n <= level; n++) {
    composed.push(
      ...lessonsForLevel({
        subject,
        grade,
        level: n,
        authored,
        mastery: masteryFor(adaptive, grade, n, authored.length),
      }),
    );
  }
  return [...authored, ...composed];
}

/**
 * What the adaptive engine knows, in the units the composer wants.
 *
 * The engine records a tier of 1 to 3 per topic, which is a *relative* thing:
 * 2 is "about right for this child", 1 is "give them an easier one", 3 is
 * "they are ahead here". The composer wants an absolute `d`. So the tier is
 * read as an offset from the level's own difficulty, which keeps the two
 * scales from having to agree about anything except the direction.
 *
 * Skills the engine has no evidence about are left out, so they take the
 * level's difficulty — see `Mastery`.
 */
export function masteryFor(
  state: AdaptiveState | undefined,
  grade: Grade,
  level: number,
  authoredCount: number,
): Mastery {
  if (!state) return {};
  const base = levelDifficulty(grade, level, authoredLevels({ length: authoredCount }) + 1);
  const out: Mastery = {};
  for (const [skill, stat] of Object.entries(state.topics)) {
    out[skill as keyof Mastery] = Math.max(1, base + (stat.tier - 2));
  }
  return out;
}

/** The slice of a map that one level shows. */
export const windowOf = <T,>(stops: T[], level: number): T[] =>
  stops.slice((level - 1) * LESSONS_PER_LEVEL, level * LESSONS_PER_LEVEL);

/**
 * The skills a child has been getting wrong.
 *
 * Passed to the planner as advice about what to weight towards, never as an
 * instruction — the difficulty is already handled by `masteryFor`, and this
 * only nudges *which* skills a level spends its lessons on. A skill the
 * engine has dropped to its easiest, or that has gone wrong twice running,
 * counts.
 */
export function strugglingSkills(state: AdaptiveState | undefined): string[] {
  if (!state) return [];
  return Object.entries(state.topics)
    .filter(([, stat]) => stat.tier === 1 || stat.streak <= -2)
    .map(([skill]) => skill)
    .sort();
}
