import { Grade, ProgressMap, Stars } from '../../types';
import {
  currentStory,
  isStoryUnlocked,
  passageOf,
  STORIES,
  STORIES_PER_GRADE,
  storyQuestions,
  storyStarsEarned,
  wordCount,
} from '../stories';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const ALL = GRADES.flatMap((g) => STORIES[g]);
const ALL_QUESTIONS = ALL.flatMap((s) => s.questions.map((q) => ({ story: s, q })));

/**
 * How long a paragraph may be at each grade. Wide enough that a story can be
 * rewritten, tight enough that one can't drift into the wrong reading level.
 */
const WORD_RANGE: Record<Grade, [number, number]> = {
  1: [35, 65],
  2: [55, 90],
  3: [85, 125],
  4: [105, 150],
  5: [125, 185],
};

const cleared = (ids: string[], stars: Stars = 3): ProgressMap =>
  Object.fromEntries(
    ids.map((id) => [id, { stars, bestPercent: 100, clearedAt: '2026-01-01T00:00:00.000Z' }]),
  );

describe('the story map', () => {
  it('gives every grade the same fixed number of stories', () => {
    for (const grade of GRADES) {
      expect(STORIES[grade]).toHaveLength(STORIES_PER_GRADE);
    }
  });

  it('numbers stories from 1 with unique ids', () => {
    for (const grade of GRADES) {
      STORIES[grade].forEach((story, i) => {
        expect(story.index).toBe(i + 1);
        expect(story.grade).toBe(grade);
      });
    }
    expect(new Set(ALL.map((s) => s.id)).size).toBe(ALL.length);
  });

  it('never gets easier as a grade goes on', () => {
    for (const grade of GRADES) {
      const tiers = STORIES[grade].map((s) => s.tier);
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
      }
      expect(tiers[0]).toBe(1);
      expect(tiers[tiers.length - 1]).toBe(3);
    }
  });

  it('keeps each paragraph inside its grade\'s reading level', () => {
    for (const story of ALL) {
      const [min, max] = WORD_RANGE[story.grade];
      const words = wordCount(story.text);
      expect(words).toBeGreaterThanOrEqual(min);
      expect(words).toBeLessThanOrEqual(max);
    }
  });

  it('gets longer with every grade', () => {
    const average = (grade: Grade) =>
      STORIES[grade].reduce((sum, s) => sum + wordCount(s.text), 0) / STORIES_PER_GRADE;
    for (const grade of [2, 3, 4, 5] as Grade[]) {
      expect(average(grade)).toBeGreaterThan(average((grade - 1) as Grade));
    }
  });

  it('is one paragraph per story, not several', () => {
    for (const story of ALL) {
      expect(story.text).not.toContain('\n');
    }
  });
});

describe('the questions about each story', () => {
  it('asks between three and five per story', () => {
    for (const story of ALL) {
      expect(story.questions.length).toBeGreaterThanOrEqual(3);
      expect(story.questions.length).toBeLessThanOrEqual(5);
    }
  });

  it('offers one right answer and three wrong ones, all different', () => {
    for (const { q } of ALL_QUESTIONS) {
      expect(q.distractors).toHaveLength(3);
      expect(new Set([q.answer, ...q.distractors]).size).toBe(4);
    }
  });

  it('always explains the answer and points back at the story', () => {
    for (const { q } of ALL_QUESTIONS) {
      expect(q.prompt.length).toBeGreaterThan(10);
      expect(q.explanation.length).toBeGreaterThan(20);
    }
  });

  it('checks more than one kind of comprehension per story', () => {
    for (const story of ALL) {
      expect(new Set(story.questions.map((q) => q.skill)).size).toBeGreaterThanOrEqual(2);
    }
  });

  it('uses every kind of comprehension somewhere in each grade', () => {
    for (const grade of GRADES) {
      const skills = new Set(STORIES[grade].flatMap((s) => s.questions.map((q) => q.skill)));
      expect(skills).toContain('detail');
      expect(skills).toContain('inference');
    }
  });

  it('keeps question ids unique within a story', () => {
    for (const story of ALL) {
      expect(new Set(story.questions.map((q) => q.id)).size).toBe(story.questions.length);
    }
  });
});

describe('storyQuestions', () => {
  it('turns a story into tappable quiz questions', () => {
    for (const story of ALL) {
      const questions = storyQuestions(story);
      expect(questions).toHaveLength(story.questions.length);
      for (const q of questions) {
        expect(q.mode).toBe('choice');
        // Comprehension answers are phrases, so they can never be typed.
        expect(q.answerFormat).toBeNull();
        expect(q.choices).toHaveLength(4);
        expect(q.choices).toContain(q.correctAnswer);
      }
    }
  });

  it('keeps the questions in the order they were written', () => {
    const story = STORIES[3][0];
    expect(storyQuestions(story).map((q) => q.prompt)).toEqual(
      story.questions.map((q) => q.prompt),
    );
  });

  it('shuffles the choices between plays', () => {
    const story = STORIES[5][0];
    const orders = new Set(
      Array.from({ length: 30 }, () => storyQuestions(story)[0].choices.join('|')),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('gives every question in the app a unique id', () => {
    const ids = ALL.flatMap((s) => storyQuestions(s).map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries the story along as the passage to read', () => {
    const story = STORIES[1][0];
    expect(passageOf(story)).toEqual({
      title: story.title,
      icon: story.icon,
      text: story.text,
    });
  });
});

describe('unlocking stories', () => {
  it('opens only the first story to a new reader', () => {
    const open = STORIES[1].filter((s) => isStoryUnlocked(s, {}));
    expect(open).toHaveLength(1);
    expect(open[0].index).toBe(1);
  });

  it('opens the next story once the one before it is passed', () => {
    const progress = cleared(['g1-r1'], 1);
    expect(isStoryUnlocked(STORIES[1][1], progress)).toBe(true);
    expect(isStoryUnlocked(STORIES[1][2], progress)).toBe(false);
  });

  it('points at the first unfinished story', () => {
    expect(currentStory(1, {}).index).toBe(1);
    expect(currentStory(1, cleared(['g1-r1', 'g1-r2'])).index).toBe(3);
  });

  it('counts stars per grade, and never mixes them with the math map', () => {
    const progress = cleared(['g1-r1', 'g1-r2'], 2);
    expect(storyStarsEarned(1, progress)).toBe(4);
    expect(storyStarsEarned(2, progress)).toBe(0);
    // Lesson ids share the shape but not the map, so they cannot collide.
    expect(storyStarsEarned(1, cleared(['g1-l1', 'g1-l2']))).toBe(0);
  });
});
