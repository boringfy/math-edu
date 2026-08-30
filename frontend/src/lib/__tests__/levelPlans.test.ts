/**
 * Levels the server helped plan.
 *
 * The property that matters is agreement: the map and the question builder
 * both read this cache, and if they could ever disagree a child would tap one
 * lesson and be given another. So a plan arriving has to change both, and a
 * plan that is missing or broken has to change neither.
 */

import { seedLibrary } from '../../content/testLibrary';
import { composedQuestions, lessonsForLevel } from '../endless';
import { LevelPlan, clearPlans, hasPlan, planKey, plannedLevel, setPlan, worthKeeping } from '../levelPlans';
import { strugglingSkills } from '../endless';
import { AdaptiveState } from '../adaptive';

const LIB = seedLibrary();
const authored = LIB.lessons(2);

/** A plan shaped the way the server sends one, built off a real level. */
const planFor = (level: number, title: string, source: 'ai' | 'local' = 'ai'): LevelPlan => ({
  theme: 'Market Day',
  lessons: lessonsForLevel({ subject: 'math', grade: 2, level, authored }).map((stop) => ({
    id: stop.id,
    index: stop.index,
    level,
    title,
    icon: '🛒',
    tier: stop.tier,
    skills: ['addSub'],
    slots: Array.from({ length: 10 }, () => ({ factory: 'addition', d: 6 })),
    seed: stop.id,
  })),
  source,
});

beforeEach(() => clearPlans());

describe('holding a plan', () => {
  it('is empty until one arrives', () => {
    expect(plannedLevel('math', 2, 7)).toBeNull();
    expect(hasPlan(planKey('math', 2, 7))).toBe(false);
  });

  it('hands back what was put in', () => {
    setPlan(planKey('math', 2, 7), planFor(7, 'Counting Stalls'));
    expect(plannedLevel('math', 2, 7)?.theme).toBe('Market Day');
  });

  /** A plan with no lessons would blank a level rather than name it. */
  it('refuses a plan with nothing in it', () => {
    const empty = { theme: 'Nothing', lessons: [], source: 'ai' as const };
    expect(setPlan(planKey('math', 2, 7), empty)).toBe(false);
    expect(plannedLevel('math', 2, 7)).toBeNull();
  });

  it('keeps the maps and grades apart', () => {
    setPlan(planKey('math', 2, 7), planFor(7, 'Maths One'));
    expect(plannedLevel('logic', 2, 7)).toBeNull();
    expect(plannedLevel('math', 3, 7)).toBeNull();
    expect(plannedLevel('math', 2, 8)).toBeNull();
  });

  /** Only a plan a model actually improved is worth a place on disk. */
  it('keeps only what the model improved', () => {
    setPlan(planKey('math', 2, 7), planFor(7, 'From a model', 'ai'));
    setPlan(planKey('math', 2, 8), planFor(8, 'Composed here', 'local'));
    expect(Object.keys(worthKeeping())).toEqual([planKey('math', 2, 7)]);
  });

  it('forgets everything on request, for a change of child', () => {
    setPlan(planKey('math', 2, 7), planFor(7, 'Theirs'));
    clearPlans();
    expect(plannedLevel('math', 2, 7)).toBeNull();
  });
});

describe('a plan changes what the child sees', () => {
  it('renames the lessons on the map', () => {
    const before = lessonsForLevel({ subject: 'math', grade: 2, level: 7, authored });
    setPlan(planKey('math', 2, 7), planFor(7, 'Counting Stalls'));
    const after = lessonsForLevel({ subject: 'math', grade: 2, level: 7, authored });

    expect(after[0].title).toBe('Counting Stalls');
    expect(before[0].title).not.toBe('Counting Stalls');
    // The ids are progress keys, so they must survive being renamed.
    expect(after.map((l) => l.id)).toEqual(before.map((l) => l.id));
  });

  /**
   * The one that matters. The map and the questions are built by different
   * code at different moments; if only one of them noticed the plan, a child
   * would tap "Counting Stalls" and be asked something else.
   */
  it('is used by the questions as well as the map', () => {
    setPlan(planKey('math', 2, 7), planFor(7, 'Counting Stalls'));
    const lesson = lessonsForLevel({ subject: 'math', grade: 2, level: 7, authored })[0];
    const questions = composedQuestions(lesson, authored.length);

    expect(lesson.title).toBe('Counting Stalls');
    expect(questions).toHaveLength(10);
    // The plan asked for addition throughout, and that is what was built.
    for (const q of questions ?? []) expect(q.id).toContain(':addSub#');
  });

  it('leaves the authored lessons alone entirely', () => {
    setPlan(planKey('math', 2, 1), planFor(1, 'Should Not Show'));
    const level1 = lessonsForLevel({ subject: 'math', grade: 2, level: 1, authored });
    expect(level1).toEqual(authored.slice(0, 10));
  });

  it('goes back to composing when the plan is dropped', () => {
    const composed = lessonsForLevel({ subject: 'math', grade: 2, level: 7, authored })[0].title;
    setPlan(planKey('math', 2, 7), planFor(7, 'Counting Stalls'));
    clearPlans();
    expect(lessonsForLevel({ subject: 'math', grade: 2, level: 7, authored })[0].title).toBe(
      composed,
    );
  });
});

describe('what the child is struggling with', () => {
  const state = (topics: Record<string, { tier: 1 | 2 | 3; streak: number }>): AdaptiveState => ({
    version: 1,
    updatedAt: 'x',
    rounds: 5,
    unlocked: Object.keys(topics),
    hotRounds: 0,
    topics: Object.fromEntries(
      Object.entries(topics).map(([k, v]) => [
        k,
        { window: [], streak: v.streak, tier: v.tier, unlockedAtRound: 0 },
      ]),
    ),
  });

  it('names a skill the engine has dropped to its easiest', () => {
    expect(strugglingSkills(state({ time: { tier: 1, streak: 0 } }))).toEqual(['time']);
  });

  it('names a skill that has gone wrong twice running', () => {
    expect(strugglingSkills(state({ money: { tier: 2, streak: -2 } }))).toEqual(['money']);
  });

  it('says nothing about a skill going fine', () => {
    expect(strugglingSkills(state({ addSub: { tier: 3, streak: 4 } }))).toEqual([]);
  });

  it('says nothing at all before there is any evidence', () => {
    expect(strugglingSkills(undefined)).toEqual([]);
  });
});
