/**
 * Checking a story that has been read out loud.
 *
 * This is a much easier problem than transcribing speech, because the words
 * are already known: the passage is on screen. So the job is only to line up
 * what the recogniser heard against what the child was supposed to say, and
 * count how much of it landed.
 *
 * Nothing here touches the microphone or any native module — it is a pure
 * function from (passage, transcript) to a score, which is what makes it
 * testable off-device.
 */

/** How much of the story has to be heard before the reading counts as done. */
export const PASS_PERCENT = 60;

/**
 * How far ahead of the cursor a heard word may match. Wide enough to skip a
 * word the recogniser dropped, narrow enough that a stray "the" cannot leap
 * half a paragraph and strand everything behind it.
 */
const LOOKAHEAD = 10;

/** A word, or the punctuation and spacing between two of them. */
export interface PassageToken {
  text: string;
  /** Its position in the word list, or null for the bits in between. */
  wordIndex: number | null;
}

export interface ReadingScore {
  /** Parallel to the word list: whether each word was heard. */
  heard: boolean[];
  heardCount: number;
  total: number;
  /** Whole percent, 0–100. */
  percent: number;
  passed: boolean;
}

/**
 * Words may hold an apostrophe or a hyphen inside them ("don't", "well-fed")
 * but never at the edges, where they are punctuation instead.
 */
const WORD = /[a-z0-9]+(?:['’-][a-z0-9]+)*/gi;

/** Recognisers write small numbers as digits about as often as as words. */
const NUMBER_WORDS: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
  '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
  '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
  '18': 'eighteen', '19': 'nineteen', '20': 'twenty',
};

/**
 * Reduces a word to the form both sides are compared in: lower case, curly
 * quotes straightened, and small numbers spelled out so that "3" written in a
 * story still matches a child who says "three".
 */
export function normalise(word: string): string {
  const plain = word.toLowerCase().replace(/’/g, "'");
  return NUMBER_WORDS[plain] ?? plain;
}

/**
 * Splits a passage into words and the punctuation between them, so the screen
 * can highlight one word without losing the shape of the text around it.
 */
export function tokenise(text: string): PassageToken[] {
  const tokens: PassageToken[] = [];
  let cursor = 0;
  let wordIndex = 0;

  for (const match of text.matchAll(WORD)) {
    const start = match.index;
    if (start > cursor) tokens.push({ text: text.slice(cursor, start), wordIndex: null });
    tokens.push({ text: match[0], wordIndex: wordIndex++ });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), wordIndex: null });

  return tokens;
}

/** Just the words of a passage, in the form transcripts are matched against. */
export function passageWords(text: string): string[] {
  return (text.match(WORD) ?? []).map(normalise);
}

/**
 * Words worth telling the recogniser to expect.
 *
 * The recogniser is guessing at a child's voice, which it is bad at, but we
 * happen to know almost exactly which words are coming. Handing it the story's
 * own vocabulary tilts its guesses towards the right answers. Short words are
 * left out — they are the ones it already gets right, and the list is capped
 * because a biasing list the length of a paragraph stops being a hint.
 */
export function biasingWords(words: string[], limit = 50): string[] {
  const seen = new Set<string>();
  for (const word of words) {
    if (word.length > 3) seen.add(word);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

/** The words that appear exactly once, which are safe to re-sync on. */
function uniquePositions(words: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const first = new Map<string, number>();
  words.forEach((word, i) => {
    counts.set(word, (counts.get(word) ?? 0) + 1);
    if (!first.has(word)) first.set(word, i);
  });

  const unique = new Map<string, number>();
  for (const [word, count] of counts) {
    if (count === 1) unique.set(word, first.get(word)!);
  }
  return unique;
}

/**
 * Lines a transcript up against the expected words and reports how much of
 * the story was heard.
 *
 * Walks the transcript left to right against a cursor that only ever moves
 * forward, so a word repeated later in the story is credited to the place it
 * was actually read rather than the first place it appears. Words the
 * recogniser invented are simply dropped.
 *
 * Because it is a left-to-right fold that only ever sets `heard` to true, a
 * longer transcript can never score lower than a shorter one it starts with —
 * which matters, since the live interim results grow as the child reads.
 */
export function scoreReading(words: string[], transcript: string): ReadingScore {
  const heard = new Array<boolean>(words.length).fill(false);
  const unique = uniquePositions(words);
  let cursor = 0;
  let heardCount = 0;

  const mark = (i: number) => {
    heard[i] = true;
    heardCount++;
    cursor = i + 1;
  };

  for (const match of transcript.matchAll(WORD)) {
    const spoken = normalise(match[0]);

    // The common case: the next word, or one a little further on if the
    // recogniser swallowed something.
    const limit = Math.min(words.length, cursor + LOOKAHEAD);
    let found = -1;
    for (let i = cursor; i < limit; i++) {
      if (!heard[i] && words[i] === spoken) {
        found = i;
        break;
      }
    }
    if (found !== -1) {
      mark(found);
      continue;
    }

    // Nothing nearby matched. If this word appears only once in the whole
    // story then hearing it is strong evidence of where the child actually
    // is, so jump the cursor there rather than losing the rest of the read.
    const only = unique.get(spoken);
    if (only !== undefined && only >= limit && !heard[only]) mark(only);
  }

  const total = words.length;
  const percent = total === 0 ? 0 : Math.round((heardCount / total) * 100);

  return { heard, heardCount, total, percent, passed: percent >= PASS_PERCENT };
}
