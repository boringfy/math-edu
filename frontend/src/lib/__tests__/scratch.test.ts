import {
  DEFAULT_INK,
  ERASER_RADIUS,
  INK_COLORS,
  MIN_SAMPLE_DISTANCE,
  Mark,
  Point,
  Stroke,
  appendPoint,
  eraseAround,
  eraserButtonHeld,
  strokePath,
} from '../scratch';

/** A horizontal line of `count` points, one pixel apart, at y = 10. */
const line = (count: number): Stroke =>
  Array.from({ length: count }, (_, i) => ({ x: i, y: 10 }));

describe('strokePath', () => {
  it('draws a stroke as a move followed by lines', () => {
    expect(strokePath([{ x: 1, y: 2 }, { x: 3.04, y: 4 }])).toBe('M 1 2 L 3 4');
  });

  it('draws a single tap as a dot rather than nothing', () => {
    expect(strokePath([{ x: 5, y: 6 }])).toBe('M 5 6 L 5 6');
  });

  it('has nothing to draw for an empty stroke', () => {
    expect(strokePath([])).toBe('');
  });
});

describe('appendPoint', () => {
  it('keeps a point that has travelled far enough', () => {
    const stroke = [{ x: 0, y: 0 }];
    expect(appendPoint(stroke, { x: 0, y: MIN_SAMPLE_DISTANCE })).toHaveLength(2);
  });

  it('returns the same stroke for a point on top of the last, so nothing redraws', () => {
    const stroke = [{ x: 0, y: 0 }];
    expect(appendPoint(stroke, { x: 0.2, y: 0.2 })).toBe(stroke);
  });

  it('always keeps the first point', () => {
    expect(appendPoint([], { x: 4, y: 4 })).toEqual([{ x: 4, y: 4 }]);
  });
});

/** A mark in the default ink, for the tests that do not care about colour. */
const mark = (points: Point[], color = DEFAULT_INK): Mark => ({ points, color });

describe('eraseAround', () => {
  it('splits a stroke rubbed in the middle into the pieces either side', () => {
    const erased = eraseAround([mark(line(60))], { x: 30, y: 10 }, 5);
    expect(erased).toHaveLength(2);
    expect(erased[0].points.every((p) => p.x < 25)).toBe(true);
    expect(erased[1].points.every((p) => p.x > 35)).toBe(true);
  });

  it('takes the whole stroke when the eraser covers it', () => {
    expect(eraseAround([mark(line(4))], { x: 2, y: 10 }, ERASER_RADIUS)).toEqual([]);
  });

  it('leaves the other strokes alone', () => {
    const marks = [mark(line(4)), mark([{ x: 200, y: 200 }])];
    expect(eraseAround(marks, { x: 2, y: 10 }, ERASER_RADIUS)).toEqual([marks[1]]);
  });

  it('drops a lone leftover point but keeps a deliberate dot', () => {
    // Rubbing out all but the first point of a line leaves a speck, not a mark.
    expect(eraseAround([mark(line(20))], { x: 12, y: 10 }, 11)).toEqual([]);
    const dot = mark([{ x: 0, y: 0 }]);
    expect(eraseAround([dot], { x: 90, y: 90 })).toEqual([dot]);
  });

  it('returns the very same marks when it touched nothing', () => {
    const marks = [mark(line(5))];
    expect(eraseAround(marks, { x: 500, y: 500 })).toBe(marks);
  });

  /** The colour belongs to the mark, so cutting one in half yields two of it. */
  it('gives every surviving piece the ink it was drawn in', () => {
    const red = INK_COLORS[2].value;
    const erased = eraseAround([mark(line(60), red)], { x: 30, y: 10 }, 5);
    expect(erased).toHaveLength(2);
    expect(erased.every((m) => m.color === red)).toBe(true);
  });

  it('rubs out one colour without touching another', () => {
    const blue = INK_COLORS[1].value;
    const far = mark([{ x: 500, y: 500 }, { x: 505, y: 505 }], blue);
    const kept = eraseAround([mark(line(4)), far], { x: 2, y: 10 }, ERASER_RADIUS);
    expect(kept).toEqual([far]);
  });
});

describe('the inks on offer', () => {
  it('offers five, starting with black', () => {
    expect(INK_COLORS).toHaveLength(5);
    expect(INK_COLORS[0].name).toBe('Black');
    expect(DEFAULT_INK).toBe(INK_COLORS[0].value);
  });

  it('gives each a distinct colour and a name to announce', () => {
    expect(new Set(INK_COLORS.map((c) => c.value)).size).toBe(5);
    expect(INK_COLORS.every((c) => /^#[0-9a-f]{6}$/i.test(c.value))).toBe(true);
    expect(INK_COLORS.every((c) => c.name.length > 0)).toBe(true);
  });
});

/**
 * Android hands a stylus the raw MotionEvent button state rather than the
 * W3C bitmask, and reports a side button under more than one bit depending
 * on the tablet. Getting this wrong means the button quietly does nothing,
 * which is indistinguishable from the pen not having one.
 */
describe('eraserButtonHeld', () => {
  it('is not held when the pen is only touching the paper', () => {
    expect(eraserButtonHeld(0)).toBe(false);
    // BUTTON_PRIMARY is the tip, which writes.
    expect(eraserButtonHeld(0x1)).toBe(false);
  });

  it('is held for every bit Android reports a side button under', () => {
    expect(eraserButtonHeld(0x2)).toBe(true); // BUTTON_SECONDARY (compat)
    expect(eraserButtonHeld(0x4)).toBe(true); // BUTTON_TERTIARY (compat)
    expect(eraserButtonHeld(0x20)).toBe(true); // BUTTON_STYLUS_PRIMARY
    expect(eraserButtonHeld(0x40)).toBe(true); // BUTTON_STYLUS_SECONDARY
  });

  it('is held when the tip and the button are reported together', () => {
    // Which is the normal case: the pen is down and the button is pressed.
    expect(eraserButtonHeld(0x1 | 0x20)).toBe(true);
    expect(eraserButtonHeld(0x1 | 0x2 | 0x20)).toBe(true);
  });

  it('survives an event that carries no button field at all', () => {
    expect(eraserButtonHeld(undefined)).toBe(false);
    expect(eraserButtonHeld(null)).toBe(false);
  });
});
