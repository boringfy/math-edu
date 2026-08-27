import { StyleSheet, View } from 'react-native';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { Path } from 'react-native-svg';
import ScratchPad from '../ScratchPad';

/** A pointer event, of the kind Android sends for a pen or for a hand. */
let pointer = 0;
const event = (x: number, y: number, pointerType: string, id: number, buttons = 0) => ({
  nativeEvent: { offsetX: x, offsetY: y, pointerId: id, pointerType, buttons },
});

/**
 * The paper itself: the first view that answers for pointers, the ones after
 * it being the buttons in the corner.
 */
const paper = (tree: ReactTestRenderer): ReactTestInstance =>
  tree.root.findAll(
    (n) => typeof n.type === 'string' && n.props.onPointerDown !== undefined,
  )[0];

/** Draws across the paper with a pen, a finger, or a palm. */
const draw = (
  tree: ReactTestRenderer,
  points: [number, number][],
  pointerType = 'pen',
  buttons = 0,
) =>
  act(() => {
    const view = paper(tree);
    const id = (pointer += 1);
    const [[x0, y0], ...rest] = points;
    view.props.onPointerDown(event(x0, y0, pointerType, id, buttons));
    for (const [x, y] of rest) view.props.onPointerMove(event(x, y, pointerType, id, buttons));
    const [lastX, lastY] = points[points.length - 1];
    view.props.onPointerUp(event(lastX, lastY, pointerType, id, buttons));
  });

/**
 * A stroke where the side button changes part way through, which is the case
 * that matters: a child rubbing something out does not lift the pen first.
 *
 * `buttonsAt` says what the button is doing at each point along the way.
 */
const drawWithButton = (
  tree: ReactTestRenderer,
  points: [number, number][],
  buttonsAt: number[],
) =>
  act(() => {
    const view = paper(tree);
    const id = (pointer += 1);
    const [[x0, y0], ...rest] = points;
    view.props.onPointerDown(event(x0, y0, 'pen', id, buttonsAt[0]));
    rest.forEach(([x, y], i) =>
      view.props.onPointerMove(event(x, y, 'pen', id, buttonsAt[i + 1] ?? 0)),
    );
    const [lastX, lastY] = points[points.length - 1];
    view.props.onPointerUp(event(lastX, lastY, 'pen', id, 0));
  });

const press = (tree: ReactTestRenderer, label: string) =>
  act(() => {
    tree.root
      .find((n) => typeof n.type !== 'string' && n.props.accessibilityLabel === label)
      .props.onPress();
  });

/** How many marks are actually painted on the paper. */
const paths = (tree: ReactTestRenderer) => tree.root.findAllByType(Path);

/** Every string on the paper, for the hints it puts up. */
const textOf = (tree: ReactTestRenderer): string => {
  const walk = (node: unknown): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(walk).join('');
    if (node && typeof node === 'object' && 'children' in node) {
      return walk((node as { children: unknown }).children);
    }
    return '';
  };
  return walk(tree.toJSON());
};

const render = (penOnly: boolean): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<ScratchPad penOnly={penOnly} />);
  });
  return tree;
};

// The "use the pen" hint takes itself down on a timer; without this it
// outlives the test that raised it.
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('ScratchPad', () => {
  it('stretches into the space it is given rather than asking for a height', () => {
    const style = StyleSheet.flatten(render(true).root.findAllByType(View)[0].props.style);
    expect(style.flex).toBe(1);
    // With a floor, so a crowded question still leaves something to write on.
    expect(style.minHeight).toBeGreaterThan(0);
  });

  it('draws what a pen traces, and keeps each stroke as one mark', () => {
    const tree = render(true);
    expect(paths(tree)).toHaveLength(0);

    draw(tree, [[10, 10], [40, 10], [40, 60]]);
    expect(paths(tree)).toHaveLength(1);
    expect(paths(tree)[0].props.d).toBe('M 10 10 L 40 10 L 40 60');

    draw(tree, [[80, 10], [80, 60]]);
    expect(paths(tree)).toHaveLength(2);
  });

  it('turns away the hand a child rests on the paper while writing', () => {
    const tree = render(true);

    draw(tree, [[10, 10], [200, 400]], 'touch');
    expect(paths(tree)).toHaveLength(0);
    // Android reports a recognised palm as neither pen nor finger.
    draw(tree, [[10, 10], [200, 400]], '');
    expect(paths(tree)).toHaveLength(0);
    // And says why, rather than looking broken, then takes it back down.
    expect(textOf(tree)).toContain('Use the pen');
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(textOf(tree)).not.toContain('Use the pen');

    draw(tree, [[10, 10], [40, 40]]);
    expect(paths(tree)).toHaveLength(1);
  });

  it('ignores a palm that lands part-way through a pen stroke', () => {
    const tree = render(true);
    const view = paper(tree);

    act(() => {
      view.props.onPointerDown(event(10, 10, 'pen', 1));
      view.props.onPointerMove(event(60, 10, 'pen', 1));
      // A hand comes down and drags while the pen is still writing.
      view.props.onPointerDown(event(300, 300, 'touch', 2));
      view.props.onPointerMove(event(360, 360, 'touch', 2));
      view.props.onPointerUp(event(360, 360, 'touch', 2));
      view.props.onPointerMove(event(60, 60, 'pen', 1));
      view.props.onPointerUp(event(60, 60, 'pen', 1));
    });

    expect(paths(tree)).toHaveLength(1);
    expect(paths(tree)[0].props.d).toBe('M 10 10 L 60 10 L 60 60');
  });

  it('takes a fingertip when the pen is not required', () => {
    const tree = render(false);
    draw(tree, [[10, 10], [40, 40]], 'touch');
    expect(paths(tree)).toHaveLength(1);
  });

  it('rubs out only the part the eraser passes over', () => {
    const tree = render(true);

    // One long line, sampled densely enough for the eraser to bite into it.
    draw(tree, Array.from({ length: 60 }, (_, i) => [10 + i * 3, 50] as [number, number]));
    expect(paths(tree)).toHaveLength(1);

    press(tree, 'Eraser');
    draw(tree, [[100, 50], [100, 50]]);

    // The line comes back as the two pieces either side of the rubbed-out bit.
    expect(paths(tree)).toHaveLength(2);

    // And the button now offers the way back to drawing.
    press(tree, 'Draw');
    draw(tree, [[10, 90], [60, 90]]);
    expect(paths(tree)).toHaveLength(3);
  });

  it('clears the whole page at a tap', () => {
    const tree = render(true);
    draw(tree, [[10, 10], [40, 40]]);
    draw(tree, [[50, 10], [80, 40]]);
    expect(paths(tree)).toHaveLength(2);

    press(tree, 'Clear scratch paper');
    expect(paths(tree)).toHaveLength(0);
  });
});

/**
 * The pen has a button on its side. Holding it rubs out, letting go writes
 * again — without going near the eraser in the corner, which is the whole
 * point: a child working out a sum should not have to put the pen down and
 * find a button to fix a digit.
 */
describe('the pen\'s side button', () => {
  /** Android's BUTTON_STYLUS_PRIMARY, which is what a pen barrel reports. */
  const STYLUS = 0x20;
  /** The same press, on a tablet that reports it the compatibility way. */
  const SECONDARY = 0x2;

  it('writes when the button is not held', () => {
    const tree = render(true);
    draw(tree, [[10, 10], [40, 40]]);
    expect(paths(tree)).toHaveLength(1);
  });

  it('rubs out instead of writing while the button is held', () => {
    const tree = render(true);
    draw(tree, [[10, 10], [40, 40]]);
    expect(paths(tree)).toHaveLength(1);

    // Straight back over the same line, button held. Nothing new is drawn,
    // and what was there is gone.
    draw(tree, [[10, 10], [40, 40]], 'pen', STYLUS);
    expect(paths(tree)).toHaveLength(0);
  });

  it('accepts the compatibility bit some tablets report instead', () => {
    const tree = render(true);
    draw(tree, [[10, 10], [40, 40]]);
    draw(tree, [[10, 10], [40, 40]], 'pen', SECONDARY);
    expect(paths(tree)).toHaveLength(0);
  });

  it('writes again the moment the button is released', () => {
    const tree = render(true);
    draw(tree, [[10, 10], [40, 40]], 'pen', STYLUS);
    expect(paths(tree)).toHaveLength(0);

    draw(tree, [[10, 10], [40, 40]]);
    expect(paths(tree)).toHaveLength(1);
  });

  it('starts rubbing out mid-stroke, keeping what was already written', () => {
    const tree = render(true);
    // Something to rub out, far from where the next stroke starts.
    draw(tree, [[200, 200], [240, 240]]);
    expect(paths(tree)).toHaveLength(1);

    // Write a little, then press the button and go over the old mark.
    drawWithButton(
      tree,
      [[10, 10], [30, 30], [200, 200], [240, 240]],
      [0, 0, STYLUS, STYLUS],
    );

    // The bit written before the button went down is kept; the old mark is
    // rubbed out by the bit after it.
    const drawn = paths(tree).map((p) => p.props.d as string);
    expect(drawn).toHaveLength(1);
    expect(drawn[0]).toContain('10');
    expect(drawn[0]).not.toContain('240');
  });

  it('starts writing again mid-stroke when the button comes up', () => {
    const tree = render(true);
    drawWithButton(tree, [[10, 10], [30, 30], [60, 60], [90, 90]], [STYLUS, STYLUS, 0, 0]);

    // Only the part drawn after the button was released leaves a mark.
    const drawn = paths(tree).map((p) => p.props.d as string);
    expect(drawn).toHaveLength(1);
    expect(drawn[0]).toContain('60');
    expect(drawn[0]).not.toContain('10 10');
  });

  it('says so on the paper while the button is held', () => {
    const tree = render(true);
    act(() => {
      const view = paper(tree);
      view.props.onPointerDown(event(10, 10, 'pen', (pointer += 1), STYLUS));
    });
    expect(textOf(tree)).toContain('Rubbing out');

    act(() => paper(tree).props.onPointerUp(event(10, 10, 'pen', pointer, 0)));
    expect(textOf(tree)).not.toContain('Rubbing out');
  });

  it('leaves the corner eraser as the child set it', () => {
    const tree = render(true);
    // Turn the eraser on by hand, then use the button and let go.
    press(tree, 'Eraser');
    draw(tree, [[10, 10], [40, 40]], 'pen', STYLUS);

    // Still erasing, because that is what the child chose.
    draw(tree, [[60, 60], [90, 90]]);
    expect(paths(tree)).toHaveLength(0);
  });

  it('still ignores a palm, button or no button', () => {
    const tree = render(true);
    draw(tree, [[10, 10], [40, 40]]);
    draw(tree, [[10, 10], [40, 40]], 'touch', STYLUS);
    // The palm neither drew nor rubbed anything out.
    expect(paths(tree)).toHaveLength(1);
  });
});
