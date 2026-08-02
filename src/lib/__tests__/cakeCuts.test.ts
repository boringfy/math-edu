import { Chord, chordThroughDrag, countPieces, sameCut } from '../cakeCuts';

const CENTER = { x: 100, y: 100 };
const RADIUS = 80;

/** A chord at `angle` radians, offset from the centre by `offset`. */
function chordAt(angle: number, offset = 0): Chord {
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const mid = { x: CENTER.x + nx * offset, y: CENTER.y + ny * offset };
  const half = Math.sqrt(RADIUS * RADIUS - offset * offset);
  return {
    x1: mid.x - Math.cos(angle) * half,
    y1: mid.y - Math.sin(angle) * half,
    x2: mid.x + Math.cos(angle) * half,
    y2: mid.y + Math.sin(angle) * half,
  };
}

describe('countPieces', () => {
  it('counts an uncut cake as one piece', () => {
    expect(countPieces([])).toBe(1);
  });

  it('counts one cut as two pieces', () => {
    expect(countPieces([chordAt(0)])).toBe(2);
  });

  it('counts two crossing cuts as four pieces', () => {
    expect(countPieces([chordAt(0), chordAt(Math.PI / 2)])).toBe(4);
  });

  it('counts two parallel cuts as three pieces', () => {
    expect(countPieces([chordAt(0, -30), chordAt(0, 30)])).toBe(3);
  });

  it('counts three cuts through the middle as six pieces', () => {
    const cuts = [chordAt(0), chordAt(Math.PI / 3), chordAt((2 * Math.PI) / 3)];
    expect(countPieces(cuts)).toBe(6);
  });

  it('counts three cuts crossing at different points as seven pieces', () => {
    const cuts = [chordAt(0, -20), chordAt(Math.PI / 3, 20), chordAt((2 * Math.PI) / 3, -10)];
    expect(countPieces(cuts)).toBe(7);
  });

  it('counts two parallel cuts plus one crossing both as six pieces', () => {
    const cuts = [chordAt(0, -30), chordAt(0, 30), chordAt(Math.PI / 2)];
    expect(countPieces(cuts)).toBe(6);
  });

  it('counts four cuts through the middle as eight pieces', () => {
    const cuts = [0, 1, 2, 3].map((i) => chordAt((i * Math.PI) / 4));
    expect(countPieces(cuts)).toBe(8);
  });

  it('ignores a cut drawn along an existing one', () => {
    const cut = chordAt(0);
    expect(countPieces([cut, cut, cut], 1)).toBe(2);
  });

  it('treats near-miss crossings as one point when within tolerance', () => {
    // Three cuts aimed at the middle but each slightly off, as a finger would.
    const cuts = [chordAt(0, 1), chordAt(Math.PI / 3, -1.5), chordAt((2 * Math.PI) / 3, 1)];
    expect(countPieces(cuts, 0.08 * RADIUS)).toBe(6);
    // With no tolerance those same cuts miss each other and give seven.
    expect(countPieces(cuts, 1e-9)).toBe(7);
  });

  it('never counts cuts that only meet at the rim', () => {
    // Two chords sharing an endpoint on the edge don't cross inside.
    const a: Chord = { x1: 20, y1: 100, x2: 180, y2: 100 };
    const b: Chord = { x1: 20, y1: 100, x2: 100, y2: 180 };
    expect(countPieces([a, b])).toBe(3);
  });
});

describe('chordThroughDrag', () => {
  it('extends a short swipe into a full cut across the cake', () => {
    const cut = chordThroughDrag({ x: 90, y: 100 }, { x: 110, y: 100 }, CENTER, RADIUS);
    expect(cut).not.toBeNull();
    expect(cut!.x1).toBeCloseTo(20, 6);
    expect(cut!.x2).toBeCloseTo(180, 6);
    expect(cut!.y1).toBeCloseTo(100, 6);
    expect(cut!.y2).toBeCloseTo(100, 6);
  });

  it('ignores a tap or a drag too short to read as a cut', () => {
    expect(chordThroughDrag({ x: 100, y: 100 }, { x: 100, y: 100 }, CENTER, RADIUS)).toBeNull();
    expect(chordThroughDrag({ x: 100, y: 100 }, { x: 104, y: 100 }, CENTER, RADIUS)).toBeNull();
  });

  it('ignores a drag whose line misses the cake', () => {
    const cut = chordThroughDrag({ x: 0, y: 0 }, { x: 200, y: 0 }, CENTER, RADIUS);
    expect(cut).toBeNull();
  });

  it('still cuts when the drag starts outside the cake', () => {
    const cut = chordThroughDrag({ x: 0, y: 100 }, { x: 40, y: 100 }, CENTER, RADIUS);
    expect(cut).not.toBeNull();
    expect(countPieces([cut!])).toBe(2);
  });
});

describe('sameCut', () => {
  it('matches a cut against itself regardless of direction', () => {
    const cut = chordAt(0.4);
    const flipped: Chord = { x1: cut.x2, y1: cut.y2, x2: cut.x1, y2: cut.y1 };
    expect(sameCut(cut, flipped, 1)).toBe(true);
  });

  it('does not match genuinely different cuts', () => {
    expect(sameCut(chordAt(0), chordAt(Math.PI / 2), 1)).toBe(false);
  });
});
