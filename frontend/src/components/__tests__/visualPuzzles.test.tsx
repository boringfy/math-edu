import { StyleSheet, View } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import CutBoard from '../CutBoard';
import PuzzleTile from '../PuzzleTile';
import type { Chord } from '../../lib/cakeCuts';

const render = (element: React.ReactElement): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(element); });
  return tree;
};

describe('visual puzzle tiles', () => {
  it('shows a visible gap for a missing pattern tile', () => {
    const tree = render(<PuzzleTile tile={null} size={80} />);
    expect(JSON.stringify(tree.toJSON())).toContain('?');
    expect(StyleSheet.flatten(tree.root.findAllByType(View)[0].props.style)).toMatchObject({
      width: 80, height: 80, borderStyle: 'dashed',
    });
  });

  it('distinguishes filled and hollow shapes, even with several in a tile', () => {
    const tree = render(<PuzzleTile size={78} tile={{ type: 'shapes', shapes: [
      { kind: 'circle', filled: true }, { kind: 'square', filled: false },
      { kind: 'triangle', filled: true }, { kind: 'diamond', filled: false },
    ] }} />);
    expect(JSON.stringify(tree.toJSON())).toContain('● □ ▲ ◇');
  });

  it('draws a clock with twelve ticks and hands at the requested time', () => {
    const tree = render(<PuzzleTile size={90} tile={{ type: 'clock', hour: 3, minute: 30 }} />);
    const rotations = tree.root.findAllByType(View).flatMap((node) => {
      const style = StyleSheet.flatten(node.props.style);
      return style?.transform?.map((transform: { rotate?: string }) => transform.rotate) ?? [];
    });
    expect(rotations).toContain('105deg'); // hour hand has moved halfway to four
    expect(rotations).toContain('180deg'); // minute hand points at six
    expect(rotations).toHaveLength(14);
  });

  it('draws every grid cell, including blanks', () => {
    const tree = render(<PuzzleTile size={72} tile={{ type: 'grid', size: 2, cells: [true, false, false, true] }} />);
    const cells = tree.root.findAllByType(View).filter((node) =>
      StyleSheet.flatten(node.props.style)?.margin === 1,
    );
    expect(cells).toHaveLength(4);
    expect(StyleSheet.flatten(cells[0].props.style).backgroundColor)
      .not.toBe(StyleSheet.flatten(cells[1].props.style).backgroundColor);
  });
});

describe('cake-cut board', () => {
  const task = { cuts: 2, pieces: 4, hint: 'Cross the cuts.' };
  const onSubmit = jest.fn();
  let cuts: Chord[];
  let tree: ReactTestRenderer;

  const update = () => tree.update(
    <CutBoard task={task} cuts={cuts} size={200} onChange={onChange} onSubmit={onSubmit} />,
  );
  const onChange = (next: Chord[]) => { cuts = next; update(); };
  const canvas = () => tree.root.findAll((node) => typeof node.props.onResponderGrant === 'function')[0];
  const press = (label: string) => act(() => {
    tree.root.findAll((node) => typeof node.props.onPress === 'function' &&
      node.findAll((child) => child.children.includes(label)).length > 0)[0].props.onPress();
  });
  const drag = (from: [number, number], to: [number, number]) => act(() => {
    const view = canvas();
    const event = (point: [number, number]) => ({
      nativeEvent: { locationX: point[0], locationY: point[1] },
      touchHistory: { touchBank: [], numberActiveTouches: 0, mostRecentTimeStamp: 0 },
    });
    view.props.onResponderGrant(event(from));
    view.props.onResponderMove(event(to));
    view.props.onResponderRelease(event(to));
  });

  beforeEach(() => {
    cuts = [];
    onSubmit.mockClear();
    tree = render(<CutBoard task={task} cuts={cuts} size={200} onChange={onChange} onSubmit={onSubmit} />);
  });

  it('adds a swipe as a cut, counts pieces, and submits the current count', () => {
    drag([20, 100], [180, 100]);
    expect(cuts).toHaveLength(1);
    expect(JSON.stringify(tree.toJSON())).toContain('1 cut left');
    expect(tree.root.findAll((node) => node.children.includes(' of '))[0].children.join(''))
      .toBe('2 pieces of 4');
    press('Check answer');
    expect(onSubmit).toHaveBeenCalledWith(2);
  });

  it('ignores tiny swipes and duplicate cuts', () => {
    drag([20, 100], [25, 100]);
    expect(cuts).toHaveLength(0);
    drag([20, 100], [180, 100]);
    drag([20, 100], [180, 100]);
    expect(cuts).toHaveLength(1);
  });

  it('lets a child undo or start over', () => {
    drag([20, 100], [180, 100]);
    drag([100, 20], [100, 180]);
    expect(cuts).toHaveLength(2);
    press('Undo');
    expect(cuts).toHaveLength(1);
    press('Start over');
    expect(cuts).toHaveLength(0);
  });
});
