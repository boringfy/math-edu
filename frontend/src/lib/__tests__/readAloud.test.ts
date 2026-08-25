import { Grade } from '../../types';
import {
  PASS_PERCENT,
  normalise,
  passageWords,
  scoreReading,
  tokenise,
} from '../readAloud';
import { seedLibrary } from '../../content/testLibrary';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const LIB = seedLibrary();
const ALL_STORIES = GRADES.flatMap((g) => LIB.stories(g));

/** Scores a passage against something said out loud. */
const score = (passage: string, said: string) => scoreReading(passageWords(passage), said);

describe('tokenise', () => {
  it('puts the passage back together exactly as it was', () => {
    // Highlighting must not cost a single space or comma.
    for (const story of ALL_STORIES) {
      expect(tokenise(story.text).map((t) => t.text).join('')).toBe(story.text);
    }
  });

  it('numbers its words to match the list they are scored against', () => {
    for (const story of ALL_STORIES) {
      const words = tokenise(story.text).filter((t) => t.wordIndex !== null);
      expect(words.map((t) => t.wordIndex)).toEqual(words.map((_, i) => i));
      expect(words).toHaveLength(passageWords(story.text).length);
    }
  });

  it('keeps apostrophes inside words but not the punctuation around them', () => {
    expect(passageWords(`Mia's hand — cold, wet, "tired"!`)).toEqual([
      "mia's",
      'hand',
      'cold',
      'wet',
      'tired',
    ]);
  });
});

describe('normalise', () => {
  it('ignores case and straightens curly apostrophes', () => {
    expect(normalise('Don’t')).toBe("don't");
  });

  it('spells small numbers out, so digits and words match each other', () => {
    expect(normalise('3')).toBe('three');
    expect(normalise('three')).toBe('three');
  });
});

describe('scoreReading', () => {
  it('hears nothing before the child has said anything', () => {
    const result = score('The cat sat on the mat.', '');
    expect(result.heardCount).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('gives full marks for a story read straight through', () => {
    for (const story of ALL_STORIES) {
      const result = score(story.text, story.text);
      expect(result.percent).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.heard.every(Boolean)).toBe(true);
    }
  });

  it('does not care about case or punctuation', () => {
    expect(score('The cat sat on the mat.', 'the CAT sat On the mat').percent).toBe(100);
  });

  it('credits a repeated word to the place it was actually read', () => {
    // Only the first "the" has been said, so only the first should light up.
    const result = score('the cat sat on the mat', 'the cat');
    expect(result.heard).toEqual([true, true, false, false, false, false]);
  });

  it('carries on past a word that was skipped or missed', () => {
    const result = score('the cat sat on the mat', 'the cat on the mat');
    expect(result.heardCount).toBe(5);
    expect(result.heard[2]).toBe(false); // "sat" was never heard
  });

  it('ignores words the recogniser invented', () => {
    const result = score('the cat sat', 'the umm cat er sat');
    expect(result.percent).toBe(100);
  });

  it('finds its place again after a large chunk is skipped', () => {
    // Far more than the lookahead window, so only the unique word "penguin"
    // can tell us where the child has got to.
    const passage = `one two three four five six seven eight nine ten
      eleven twelve thirteen fourteen fifteen penguin sixteen seventeen`;
    const result = score(passage, 'one two penguin sixteen seventeen');
    expect(result.heardCount).toBe(5);
  });

  it('will not leap ahead on a word that appears all over the story', () => {
    // "the" is everywhere, so hearing one must not strand the words behind it.
    const passage = `the a b c d e f g h i j k l m the end`;
    const result = score(passage, 'the');
    expect(result.heard[0]).toBe(true);
    expect(result.heard[14]).toBe(false);
  });

  it('passes at the threshold and fails just below it', () => {
    // Ten words, so each one is worth exactly ten percent.
    const passage = 'one two three four five six seven eight nine ten';
    expect(score(passage, 'one two three four five six').percent).toBe(60);
    expect(score(passage, 'one two three four five six').passed).toBe(true);
    expect(score(passage, 'one two three four five').percent).toBe(50);
    expect(score(passage, 'one two three four five').passed).toBe(false);
    expect(PASS_PERCENT).toBe(60);
  });

  it('matches a spoken number against a written digit', () => {
    expect(score('Ben had 3 red hats', 'ben had three red hats').percent).toBe(100);
  });

  it('gives the same answer every time it is asked', () => {
    const story = ALL_STORIES[0];
    const said = story.text.split(' ').slice(0, 12).join(' ');
    expect(score(story.text, said)).toEqual(score(story.text, said));
  });

  it('never goes backwards as the child reads on', () => {
    // The live transcript grows word by word; a score that dipped would show
    // as words un-highlighting themselves on screen.
    for (const story of ALL_STORIES.slice(0, 6)) {
      const spoken = story.text.split(/\s+/);
      let previous = 0;
      for (let i = 1; i <= spoken.length; i++) {
        const { heardCount } = score(story.text, spoken.slice(0, i).join(' '));
        expect(heardCount).toBeGreaterThanOrEqual(previous);
        previous = heardCount;
      }
    }
  });

  it('never reports more words than the story has', () => {
    for (const story of ALL_STORIES) {
      // Saying the whole story twice over must not score above full marks.
      const result = score(story.text, `${story.text} ${story.text}`);
      expect(result.heardCount).toBeLessThanOrEqual(result.total);
      expect(result.percent).toBeLessThanOrEqual(100);
    }
  });

  it('fails a child who read only the opening line', () => {
    for (const story of ALL_STORIES) {
      const opening = story.text.split(/\s+/).slice(0, 5).join(' ');
      expect(score(story.text, opening).passed).toBe(false);
    }
  });
});

/**
 * A misheard word used to be able to end a read.
 *
 * The cursor only ever moves forward, so anything that moved it too far left
 * every word the child said afterwards behind it, unreachable. One word that
 * happened to appear once, late in the story, was enough to do it — and the
 * child then read the rest of the page to a recogniser that had already
 * decided they were at the end.
 */
describe('scoreReading does not lose the read', () => {
  const NUMBERS =
    'one two three four five six seven eight nine ten ' +
    'eleven twelve thirteen fourteen fifteen penguin sixteen seventeen eighteen nineteen';

  it('ignores a single stray word that appears far ahead', () => {
    // The child reads on normally; the recogniser slips in one wrong word.
    const result = score(NUMBERS, 'one two penguin three four five six');

    // Everything genuinely read is credited...
    expect(result.heard.slice(0, 6).every(Boolean)).toBe(true);
    // ...and the stray word moved nothing.
    expect(result.heard[15]).toBe(false);
    expect(result.heardCount).toBe(6);
  });

  it('keeps crediting words after a stray one, not just before it', () => {
    const before = score(NUMBERS, 'one two');
    const after = score(NUMBERS, 'one two penguin three four five six seven eight');
    expect(after.heardCount).toBeGreaterThan(before.heardCount);
  });

  it('still finds its place when the child really has jumped ahead', () => {
    // Three words in a row agree, which no coincidence produces.
    const result = score(NUMBERS, 'one two penguin sixteen seventeen');
    expect(result.heardCount).toBe(5);
    expect(result.heard[15]).toBe(true);
    expect(result.heard[16]).toBe(true);
    expect(result.heard[17]).toBe(true);
  });

  it('needs the whole run before it moves, not part of one', () => {
    // Two agreeing words is not enough on its own.
    const two = score(NUMBERS, 'one two penguin sixteen');
    expect(two.heard[15]).toBe(false);

    // The third commits it, and credits the run retrospectively.
    const three = score(NUMBERS, 'one two penguin sixteen seventeen');
    expect(three.heard[15]).toBe(true);
  });

  it('recovers if the cursor runs ahead of the child', () => {
    // "mat" pulls the cursor to the end of the line; the child then carries
    // on reading the words it skipped over.
    const passage = 'the cat sat on the mat';
    const result = score(passage, 'the mat cat sat on');
    expect(result.heardCount).toBe(5);
  });

  it('never lets one wrong word cost more than itself, across every story', () => {
    for (const story of ALL_STORIES.slice(0, 40)) {
      const spoken = passageWords(story.text);
      if (spoken.length < 12) continue;

      // Read the whole story, but with one nonsense word dropped in early.
      // The story's own last word is the cruellest choice: it is real, and it
      // is as far ahead as a word can be.
      const sabotaged = [...spoken];
      sabotaged.splice(2, 0, spoken[spoken.length - 1]);

      const clean = score(story.text, spoken.join(' '));
      const messy = score(story.text, sabotaged.join(' '));

      // A single bad word may cost a word or two. It must never cost the read.
      expect(messy.heardCount).toBeGreaterThanOrEqual(clean.heardCount - 2);
      expect(messy.passed).toBe(true);
    }
  });

  it('survives a recogniser that repeats and stutters', () => {
    const passage = 'the dog ran to the park where the children played';
    const result = score(passage, 'the the dog dog ran to the park where the children played');
    expect(result.percent).toBe(100);
  });
});

/**
 * The real test of a matcher is a real recogniser, which drops words and
 * invents them. This stands one in for it and reads all 300 stories through
 * it, because the failure this guards against — a child reading the whole
 * page and being told they read almost none of it — only shows up over a
 * whole story, never on a phrase.
 */
describe('scoreReading against a recogniser that makes mistakes', () => {
  /** Deterministic, so a bad run can be reproduced rather than reported once. */
  function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * A child reading the whole story aloud, heard imperfectly: roughly one
   * word in twelve dropped, and one in twenty hallucinated. The invented word
   * is taken from the story's own vocabulary, since the recogniser is biased
   * towards those words and they are what it reaches for.
   */
  function transcribe(words: string[], random: () => number): string {
    const out: string[] = [];
    for (const word of words) {
      if (random() < 0.08) continue;
      if (random() < 0.05) out.push(words[Math.floor(random() * words.length)]);
      out.push(word);
    }
    return out.join(' ');
  }

  it('passes a child who read the whole story, every time', () => {
    const failures: string[] = [];
    let worst = 100;

    for (const [s, story] of ALL_STORIES.entries()) {
      const words = passageWords(story.text);
      for (let trial = 0; trial < 3; trial++) {
        const said = transcribe(words, rng(s * 31 + trial));
        const { percent, passed } = score(story.text, said);
        worst = Math.min(worst, percent);
        // Named, so a regression says which story and which run to look at.
        if (!passed) failures.push(`${story.id} trial ${trial}: ${percent}%`);
      }
    }

    expect(failures).toEqual([]);
    // Well clear of the 60% pass mark, rather than scraping it.
    expect(worst).toBeGreaterThan(70);
  });

  it('is not thrown by a burst of invented words in one place', () => {
    for (const story of ALL_STORIES.slice(0, 30)) {
      const words = passageWords(story.text);
      if (words.length < 20) continue;

      // Five words from the end of the story, dropped in near the start —
      // the worst thing a recogniser can do to a forward-only cursor.
      const noise = words.slice(-5);
      const said = [...words.slice(0, 3), ...noise, ...words.slice(3)].join(' ');

      expect(score(story.text, said).passed).toBe(true);
    }
  });
});
