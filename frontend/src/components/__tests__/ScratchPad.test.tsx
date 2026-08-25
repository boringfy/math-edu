import { StyleSheet, View } from 'react-native';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { Path } from 'react-native-svg';
import ScratchPad from '../ScratchPad';

/** A pointer event, of the kind Android sends for a pen or for a hand. */
let pointer = 0;
const event = (x: number, y: number, pointerType: string, id: number) => ({
  nativeEvent: { offsetX: x, offsetY: y, pointerId: id, pointerType },
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
) =>
  act(() => {
    const view = paper(tree);
    const id = (pointer += 1);
    const [[x0, y0], ...rest] = points;
    view.props.onPointerDown(event(x0, y0, pointerType, id));
    for (const [x, y] of rest) view.props.onPointerMove(event(x, y, pointerType, id));
    const [lastX, lastY] = points[points.length - 1];
    view.props.onPointerUp(event(lastX, lastY, pointerType, id));
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
