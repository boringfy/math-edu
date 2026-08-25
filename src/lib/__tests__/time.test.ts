import { Question, Tier, Tile } from '../../types';
import {
  clockTile,
  elapsedMinutes,
  hoursToMinutes,
  readClock,
  timeFor,
  timeLater,
  whichClock,
} from '../time';

const TIERS: Tier[] = [1, 2, 3];

/** A time as it may be written: 1:00 through 12:55, never 0:05 or 13:20. */
const TIME = /^(1[0-2]|[1-9]):[0-5]\d$/;

/** "3:40" -> minutes round the face, so times can be compared and added. */
const ring = (text: string): number => {
  const [hour, minute] = text.split(':').map(Number);
  return (hour % 12) * 60 + minute;
};

const clockOf = (tile: Tile | null): { hour: number; minute: number } => {
  expect(tile).not.toBeNull();
  expect(tile!.type).toBe('clock');
  return tile as { hour: number; minute: number };
};

const timeOn = (tile: Tile | null): number => {
  const face = clockOf(tile);
  expect(face.hour).toBeGreaterThanOrEqual(1);
  expect(face.hour).toBeLessThanOrEqual(12);
  expect(face.minute).toBeGreaterThanOrEqual(0);
  expect(face.minute).toBeLessThan(60);
  return ring(`${face.hour}:${String(face.minute).padStart(2, '0')}`);
};

function expectWellFormed(q: Question) {
  expect(q.prompt).not.toMatch(/NaN|undefined|Infinity/);
  expect(q.explanation).not.toMatch(/NaN|undefined|Infinity/);
  expect(q.choices).toHaveLength(4);
  expect(new Set(q.choices).size).toBe(4);
  expect(q.choices).toContain(q.correctAnswer);
}

/**
 * The one that bites: a written time has no numeric near-misses to fall back
 * on, so a generator that hands over too few distractors gets "3:40" padded
 * into "3:401" rather than a fourth clock time.
 */
function expectEveryChoiceIsATime(q: Question) {
  for (const choice of q.choices) expect(choice).toMatch(TIME);
}

describe('reading a drawn clock', () => {
  it.each([30, 15, 5])('draws hands that match the answer at %i-minute steps', (step) => {
    for (let i = 0; i < 60; i++) {
      const q = readClock(step);
      expectWellFormed(q);
      expectEveryChoiceIsATime(q);
      expect(q.puzzle!.stimulus).toHaveLength(1);
      const shown = timeOn(q.puzzle!.stimulus[0]);
      expect(shown).toBe(ring(q.correctAnswer));
      expect(clockOf(q.puzzle!.stimulus[0]).minute % step).toBe(0);
      // The clock is the question, so it must never also be an answer.
      expect(q.puzzle!.options).toEqual({});
    }
  });

  it('is never typed, because a colon is not on the number pad', () => {
    for (let i = 0; i < 20; i++) expect(readClock(5).answerFormat).toBeNull();
  });
});

describe('picking the clock that shows a time', () => {
  it.each([30, 15, 5])('offers four different clocks at %i-minute steps', (step) => {
    for (let i = 0; i < 60; i++) {
      const q = whichClock(step);
      expectWellFormed(q);
      expect(q.choices).toEqual(['A', 'B', 'C', 'D']);

      const asked = ring(q.prompt.match(/shows (\d{1,2}:\d{2})/)![1]);
      const shown = q.choices.map((label) => timeOn(q.puzzle!.options[label]));
      expect(new Set(shown).size).toBe(4);
      expect(shown[q.choices.indexOf(q.correctAnswer)]).toBe(asked);
      // Exactly one of the four can be right.
      expect(shown.filter((t) => t === asked)).toHaveLength(1);
    }
  });
});

describe('elapsed time', () => {
  it('asks for the gap it actually drew', () => {
    for (let i = 0; i < 200; i++) {
      const q = elapsedMinutes(55);
      expectWellFormed(q);
      const [, start, end] = q.prompt.match(/at (\d{1,2}:\d{2}) and finishes at (\d{1,2}:\d{2})/)!;
      const gap = (ring(end) - ring(start) + 720) % 720;
      expect(Number(q.correctAnswer)).toBe(gap);
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(55);
    }
  });
});

describe('counting minutes on', () => {
  it.each([30, 15, 5])('lands on the right time at %i-minute steps', (step) => {
    for (let i = 0; i < 60; i++) {
      const q = timeLater(step);
      expectWellFormed(q);
      expectEveryChoiceIsATime(q);
      const [, start, span] = q.prompt.match(/It is (\d{1,2}:\d{2})\. .* (\d+) minutes later/)!;
      expect(ring(q.correctAnswer)).toBe((ring(start) + Number(span)) % 720);
    }
  });
});

describe('hours into minutes', () => {
  it('converts at 60 minutes to the hour', () => {
    for (let i = 0; i < 50; i++) {
      const q = hoursToMinutes();
      expectWellFormed(q);
      const hours = Number(q.prompt.match(/in (\d+) hours/)![1]);
      expect(Number(q.correctAnswer)).toBe(hours * 60);
    }
  });
});

describe('the clock pool', () => {
  it('is offered to grade 2 only, at every tier', () => {
    for (const tier of TIERS) {
      expect(timeFor(2, tier).length).toBeGreaterThan(0);
      for (const grade of [1, 3, 4, 5] as const) {
        expect(timeFor(grade, tier)).toHaveLength(0);
      }
    }
  });

  it('starts on half hours and works down to five minutes', () => {
    const minutesAt = (tier: Tier) => {
      const seen = new Set<number>();
      for (let i = 0; i < 200; i++) {
        for (const gen of timeFor(2, tier)) {
          const q = gen();
          const face = q.puzzle?.stimulus[0];
          if (face && face.type === 'clock') seen.add(face.minute);
        }
      }
      return seen;
    };
    expect([...minutesAt(1)].every((m) => m % 30 === 0)).toBe(true);
    expect([...minutesAt(2)].every((m) => m % 15 === 0)).toBe(true);
    expect([...minutesAt(3)].some((m) => m % 15 !== 0)).toBe(true);
  });

  it('builds every question in the pool soundly', () => {
    for (const tier of TIERS) {
      for (const gen of timeFor(2, tier)) {
        for (let i = 0; i < 40; i++) {
          const q = gen();
          expectWellFormed(q);
          // Three shapes of answer: a number of minutes, a written time, or
          // a label naming one of four drawn clocks.
          if (q.answerFormat === 'integer') expect(q.correctAnswer).toMatch(/^\d+$/);
          else if (Object.keys(q.puzzle?.options ?? {}).length > 0) {
            expect(q.choices).toEqual(['A', 'B', 'C', 'D']);
          } else expectEveryChoiceIsATime(q);
        }
      }
    }
  });
});

describe('clockTile', () => {
  it('keeps the time it was given', () => {
    expect(clockTile(7, 25)).toEqual({ type: 'clock', hour: 7, minute: 25 });
  });
});
