import {
  appendPoint,
  eraseAround,
  ERASER_RADIUS,
  MIN_SAMPLE_DISTANCE,
  Stroke,
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

describe('eraseAround', () => {
  it('splits a stroke rubbed in the middle into the pieces either side', () => {
    const erased = eraseAround([line(60)], { x: 30, y: 10 }, 5);
    expect(erased).toHaveLength(2);
    expect(erased[0].every((p) => p.x < 25)).toBe(true);
    expect(erased[1].every((p) => p.x > 35)).toBe(true);
  });

  it('takes the whole stroke when the eraser covers it', () => {
    expect(eraseAround([line(4)], { x: 2, y: 10 }, ERASER_RADIUS)).toEqual([]);
  });

  it('leaves the other strokes alone', () => {
    const strokes = [line(4), [{ x: 200, y: 200 }]];
    expect(eraseAround(strokes, { x: 2, y: 10 }, ERASER_RADIUS)).toEqual([strokes[1]]);
  });

  it('drops a lone leftover point but keeps a deliberate dot', () => {
    // Rubbing out all but the first point of a line leaves a speck, not a mark.
    expect(eraseAround([line(20)], { x: 12, y: 10 }, 11)).toEqual([]);
    expect(eraseAround([[{ x: 0, y: 0 }]], { x: 90, y: 90 })).toEqual([[{ x: 0, y: 0 }]]);
  });

  it('returns the very same strokes when it touched nothing', () => {
    const strokes = [line(5)];
    expect(eraseAround(strokes, { x: 500, y: 500 })).toBe(strokes);
  });
});
