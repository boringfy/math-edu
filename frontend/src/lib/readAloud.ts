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

/**
 * How far behind the cursor a heard word may still match.
 *
 * The cursor sometimes runs ahead of the child — the recogniser inserts a
 * word, and it lands on a match a few words further on. Without this, every
 * word between the two is lost for good, because the cursor never comes
 * back. Looking back lets the child simply carry on reading and still be
 * credited.
 *
 * Smaller than LOOKAHEAD, which is deliberate: running ahead is the rarer
 * mistake, and a wide backward window starts crediting words a child skipped
 * whenever they say the same common word later on.
 */
const LOOKBEHIND = 6;

/**
 * How many words in a row must agree before the cursor is allowed to jump
 * outside that window.
 *
 * This is the whole defence against losing a read. One word is no evidence
 * at all: a recogniser mishearing a single word that happens to appear once,
 * late in the story, used to be enough to teleport the cursor to the end and
 * strand everything the child said afterwards. Three in a row essentially
 * cannot happen by accident, and a child who really has skipped ahead is
 * back in step after three words.
 */
const RESYNC_RUN = 3;

/** How many rival re-sync hypotheses to carry at once. */
const MAX_CANDIDATES = 8;

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

/** Every position each word occupies, for proposing re-sync candidates. */
function wordPositions(words: string[]): Map<string, number[]> {
  const index = new Map<string, number[]>();
  words.forEach((word, i) => {
    const found = index.get(word);
    if (found) found.push(i);
    else index.set(word, [i]);
  });
  return index;
}

/**
 * A guess at where the child actually is, and how many words in a row have
 * agreed with it so far. Only committed once `count` reaches `RESYNC_RUN`.
 */
interface Candidate {
  pos: number;
  count: number;
}

/**
 * Lines a transcript up against the expected words and reports how much of
 * the story was heard.
 *
 * Two ways a word can be credited:
 *
 * The ordinary one is a match near the cursor — the next word, or one a
 * little either side of it, which covers the recogniser dropping a word or
 * running slightly ahead of the child.
 *
 * The other is a re-sync, for when the child really has jumped somewhere
 * else in the story. That needs `RESYNC_RUN` words in a row to agree before
 * the cursor is allowed to move there. Guesses are carried along as rival
 * hypotheses and only one that earns enough agreement is ever acted on, so a
 * single misheard word cannot move the cursor at all.
 *
 * Every decision is made from words already spoken, never by peeking at what
 * comes next in the transcript. That is what keeps the score monotonic: the
 * live interim results grow as the child reads, and a score that dipped
 * would show up on screen as words un-highlighting themselves.
 */
export function scoreReading(words: string[], transcript: string): ReadingScore {
  const heard = new Array<boolean>(words.length).fill(false);
  const positions = wordPositions(words);
  let cursor = 0;
  let heardCount = 0;

  const mark = (i: number) => {
    if (!heard[i]) {
      heard[i] = true;
      heardCount++;
    }
    cursor = i + 1;
  };

  /** Where the child might be, if they are not where the cursor says. */
  let candidates: Candidate[] = [];

  for (const match of transcript.matchAll(WORD)) {
    const spoken = normalise(match[0]);

    // The common case: at or near the cursor. Nearest match wins, and a word
    // already credited is never credited twice.
    const from = Math.max(0, cursor - LOOKBEHIND);
    const to = Math.min(words.length, cursor + LOOKAHEAD);
    let found = -1;
    for (let i = from; i < to; i++) {
      if (!heard[i] && words[i] === spoken) {
        found = i;
        break;
      }
    }
    if (found !== -1) {
      mark(found);
      // Back in step, so every off-track guess is dead.
      candidates = [];
      continue;
    }

    // Off-track. Extend each guess this word agrees with, and open a new one
    // wherever else the word appears. A guess the word contradicts is
    // dropped, which is what stops a coincidence accumulating.
    const grown = candidates
      .filter((c) => words[c.pos + c.count] === spoken)
      .map((c) => ({ pos: c.pos, count: c.count + 1 }));

    const opened = (positions.get(spoken) ?? [])
      .filter((pos) => !grown.some((c) => c.pos === pos))
      .map((pos) => ({ pos, count: 1 }));

    candidates = [...grown, ...opened]
      .sort(
        (a, b) => b.count - a.count || Math.abs(a.pos - cursor) - Math.abs(b.pos - cursor),
      )
      .slice(0, MAX_CANDIDATES);

    // Enough agreement to believe it. Credit the whole run, since those words
    // were read while we were still making up our mind.
    const settled = candidates.find((c) => c.count >= RESYNC_RUN);
    if (settled) {
      for (let i = settled.pos; i < settled.pos + settled.count; i++) mark(i);
      candidates = [];
    }
  }

  const total = words.length;
  const percent = total === 0 ? 0 : Math.round((heardCount / total) * 100);

  return { heard, heardCount, total, percent, passed: percent >= PASS_PERCENT };
}
