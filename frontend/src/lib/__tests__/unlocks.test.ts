/**
 * The price of a lesson, and whether the sums actually work.
 *
 * The design promise is a level-sized one: a child holding two stars a lesson
 * should never be stopped by the purse. That has to be checked against the
 * real award function rather than asserted, because the two numbers live in
 * different files and nothing else would notice them drifting apart — raise
 * the price or drop `coinRates.correct` and this is what fails.
 *
 * These use the *worst* run that still earns each star rating: the lowest
 * score in the band, with the wrong answers spread out to break as many
 * streaks as possible. Real play pays more, so a margin here is a floor.
 */

import { COIN_RATES, comboMilestones, lessonAward } from '../progress';
import {
  DEFAULT_UNLOCK_COST,
  canBuy,
  chargesForLessons,
  emptyUnlocks,
  isPaid,
  mergeUnlocks,
  stopState,
  withPaid,
} from '../unlocks';
import { seedLibrary } from '../../content/testLibrary';
import { MapStop, ProgressMap } from '../../types';

const LIB = seedLibrary();

/** The fewest correct answers that still earns this many stars. */
const correctFor = (stars: 1 | 2 | 3, questions: number) =>
  stars === 3 ? questions : Math.ceil(questions * (stars === 2 ? 0.8 : 0.5));

/**
 * The unluckiest streak a score can have: wrong answers spaced to chop the
 * correct ones into as many short runs as possible.
 */
const worstCombo = (correct: number, wrong: number) => Math.floor(correct / (wrong + 1));

/** What a first clear pays at worst, for a given star rating. */
function worstAward(stars: 1 | 2 | 3, questions: number): number {
  const correct = correctFor(stars, questions);
  return lessonAward({
    correctCount: correct,
    total: questions,
    bestCombo: worstCombo(correct, questions - correct),
    firstClear: true,
  }).total;
}

describe('the price is set against what the game pays', () => {
  /** The promise, in the units it was made in: a level, not one lesson. */
  it('two stars a lesson always pays for the next level', () => {
    const short: string[] = [];
    for (const grade of [1, 2, 3, 4, 5] as const) {
      const lessons = LIB.lessons(grade);
      for (let level = 1; level <= 6; level++) {
        const inLevel = lessons.slice((level - 1) * 10, level * 10);
        const earned = inLevel.reduce(
          (sum, l) => sum + worstAward(2, l.questionCount + l.drawCount),
          0,
        );
        const cost = inLevel.length * DEFAULT_UNLOCK_COST;
        if (earned < cost) short.push(`grade ${grade} level ${level}: ${earned} < ${cost}`);
      }
    }
    expect(short).toEqual([]);
  });

  /** Composed levels are a flat ten questions, so they are the simple case. */
  it('two stars pays for a composed level too', () => {
    expect(worstAward(2, 10) * 10).toBeGreaterThanOrEqual(10 * DEFAULT_UNLOCK_COST);
  });

  /**
   * And the other half of it: scraping one star does not keep pace, so a
   * child doing that has to go back and replay something. That is the loop
   * the price exists to create — if this ever passes, the gate is doing
   * nothing and the price is too low.
   */
  it('one star a lesson does not keep pace', () => {
    expect(worstAward(1, 10) * 10).toBeLessThan(10 * DEFAULT_UNLOCK_COST);
  });

  it('three stars leaves plenty over', () => {
    expect(worstAward(3, 10)).toBeGreaterThan(DEFAULT_UNLOCK_COST * 2);
  });

  /** A replay misses the first-clear bonus but still earns its way. */
  it('replaying a lesson still pays', () => {
    const replay = lessonAward({
      correctCount: 8,
      total: 10,
      bestCombo: 4,
      firstClear: false,
    }).total;
    expect(replay).toBeGreaterThan(0);
    expect(replay).toBeLessThan(worstAward(3, 10));
    // Two decent replays cover a lesson, so being short is a short detour.
    expect(replay * 2).toBeGreaterThanOrEqual(DEFAULT_UNLOCK_COST);
  });

  it('is built from the rates it is checked against', () => {
    expect(COIN_RATES.correct).toBe(2);
    expect(comboMilestones(10)).toBe(4);
  });
});

describe('what state a lesson is in', () => {
  const stops = LIB.lessons(1);
  const passed = { stars: 2 as const, bestPercent: 85, clearedAt: 'x' };
  const state = (stop: MapStop, progress: ProgressMap, unlocks = emptyUnlocks()) =>
    stopState('math', stops, stop, progress, unlocks);

  it('never charges for the first lesson of a map', () => {
    expect(state(stops[0], {})).toBe('open');
  });

  it('keeps a lesson shut while the one before is unfinished', () => {
    expect(state(stops[1], {})).toBe('locked');
    expect(state(stops[5], {})).toBe('locked');
  });

  it('puts it up for sale once the one before is passed', () => {
    expect(state(stops[1], { [stops[0].id]: passed })).toBe('forSale');
  });

  it('opens it once bought', () => {
    const bought = withPaid('math', stops[1].id, emptyUnlocks());
    expect(state(stops[1], { [stops[0].id]: passed }, bought)).toBe('open');
  });

  /** Replaying for coins is the way out of being short, so it must be free. */
  it('leaves a lesson already passed free to replay', () => {
    expect(state(stops[0], { [stops[0].id]: passed })).toBe('cleared');
  });

  it('does not charge twice for the same lesson', () => {
    const once = withPaid('math', 'g1-l2', emptyUnlocks());
    expect(withPaid('math', 'g1-l2', once)).toBe(once);
    expect(once.math).toEqual(['g1-l2']);
  });

  it('keeps the subjects' + "' purchases apart", () => {
    const bought = withPaid('math', 'g1-l2', emptyUnlocks());
    expect(isPaid('math', 'g1-l2', bought)).toBe(true);
    expect(isPaid('logic', 'g1-l2', bought)).toBe(false);
  });
});

describe('taking the coins', () => {
  const stops = LIB.lessons(1);
  const passed = { stars: 2 as const, bestPercent: 85, clearedAt: 'x' };
  const afterFirst: ProgressMap = { [stops[0].id]: passed };
  const buy = (stop: MapStop, progress: ProgressMap, coins: number, unlocks = emptyUnlocks()) =>
    canBuy('math', stops, stop, progress, unlocks, coins, DEFAULT_UNLOCK_COST);

  it('sells the lesson that is actually for sale', () => {
    expect(buy(stops[1], afterFirst, 100)).toBe(true);
  });

  it('refuses when the purse is short, down to the last coin', () => {
    expect(buy(stops[1], afterFirst, DEFAULT_UNLOCK_COST)).toBe(true);
    expect(buy(stops[1], afterFirst, DEFAULT_UNLOCK_COST - 1)).toBe(false);
    expect(buy(stops[1], afterFirst, 0)).toBe(false);
  });

  /** The thing that must never happen: paying for something already owned. */
  it('refuses a lesson already bought', () => {
    const owned = withPaid('math', stops[1].id, emptyUnlocks());
    expect(buy(stops[1], afterFirst, 100, owned)).toBe(false);
  });

  it('refuses a lesson already passed', () => {
    expect(buy(stops[0], afterFirst, 100)).toBe(false);
  });

  /** Coins cannot open a door the star gate is holding shut. */
  it('refuses a lesson further up the map', () => {
    expect(buy(stops[4], afterFirst, 10_000)).toBe(false);
  });

  it('refuses the first lesson, which was never for sale', () => {
    expect(buy(stops[0], {}, 100)).toBe(false);
  });
});

describe('which maps charge', () => {
  const stops = LIB.stories(1);
  const passed = { stars: 2 as const, bestPercent: 85, clearedAt: 'x' };

  it('charges for sums and puzzles, not for stories', () => {
    expect(chargesForLessons('math')).toBe(true);
    expect(chargesForLessons('logic')).toBe(true);
    expect(chargesForLessons('reading')).toBe(false);
  });

  /** A child who wants to read the next story should just read it. */
  it('opens the next story the moment the one before is done', () => {
    expect(
      stopState('reading', stops, stops[1], { [stops[0].id]: passed }, emptyUnlocks(), false),
    ).toBe('open');
  });

  it('still makes them read them in order', () => {
    expect(stopState('reading', stops, stops[1], {}, emptyUnlocks(), false)).toBe('locked');
  });

  it('never takes coins for a story', () => {
    expect(
      canBuy(
        'reading',
        stops,
        stops[1],
        { [stops[0].id]: passed },
        emptyUnlocks(),
        10_000,
        DEFAULT_UNLOCK_COST,
        false,
      ),
    ).toBe(false);
  });

  /** A deployment can change its mind without an app release. */
  it('follows the rules pack when it says otherwise', () => {
    expect(chargesForLessons('reading', ['math', 'reading'])).toBe(true);
    expect(chargesForLessons('math', ['reading'])).toBe(false);
  });
});

describe('merging what two devices bought', () => {
  it('keeps everything either of them paid for', () => {
    const a = { math: ['g1-l2', 'g1-l3'], reading: [], logic: [] };
    const b = { math: ['g1-l3', 'g1-l4'], reading: ['g1-r2'], logic: [] };
    const merged = mergeUnlocks(a, b);
    expect([...merged.math].sort()).toEqual(['g1-l2', 'g1-l3', 'g1-l4']);
    expect(merged.reading).toEqual(['g1-r2']);
  });

  it('never takes a purchase away', () => {
    const a = { math: ['g1-l2'], reading: [], logic: [] };
    expect(mergeUnlocks(a, emptyUnlocks()).math).toEqual(['g1-l2']);
    expect(mergeUnlocks(emptyUnlocks(), a).math).toEqual(['g1-l2']);
  });
});
