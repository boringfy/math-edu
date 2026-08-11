import { Grade } from '../../types';
import {
  PASS_PERCENT,
  normalise,
  passageWords,
  scoreReading,
  tokenise,
} from '../readAloud';
import { STORIES } from '../stories';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const ALL_STORIES = GRADES.flatMap((g) => STORIES[g]);

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
