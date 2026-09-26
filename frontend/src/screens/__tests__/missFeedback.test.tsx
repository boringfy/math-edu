/**
 * What a wrong answer looks and sounds like.
 *
 * This is the part of the app most likely to be got wrong in tone rather than
 * in logic, so alongside the wiring these pin the things that keep it kind:
 * every wrong answer gets one, it is always mild, and the sound is quieter
 * than praise.
 */

const mockPlaySound = jest.fn();
jest.mock('../../lib/sfx', () => ({
  playSound: (...args: unknown[]) => mockPlaySound(...(args as [])),
  setSoundEnabled: jest.fn(),
  prepareSound: jest.fn(async () => undefined),
}));

import { act, create, ReactTestRenderer } from 'react-test-renderer';
import Celebration from '../../components/Celebration';
import MissFeedback from '../../components/MissFeedback';
import QuizScreen from '../QuizScreen';
import { MISS_SOUND, missFor } from '../../lib/celebrate';
import { Question } from '../../types';

const mounted: ReactTestRenderer[] = [];

const question = (id: string): Question => ({
  id,
  prompt: '7 × 8 = ?',
  correctAnswer: '56',
  choices: ['56', '54', '48', '64'],
  explanation: '7 × 8 = 56',
  answerFormat: 'integer',
  mode: 'choice',
});

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(element);
  });
  mounted.push(tree);
  return tree;
}

const quiz = (questions: Question[]) =>
  render(
    <QuizScreen
      subject="math"
      grade={3}
      scratchPaper={false}
      penOnly={false}
      questions={questions}
      onComplete={jest.fn()}
      onQuit={() => {}}
    />,
  );

const answer = (tree: ReactTestRenderer, label: string) => {
  const button = tree.root.find((n) => typeof n.type !== 'string' && n.props.label === label);
  act(() => button.props.onPress(label));
};

beforeEach(() => mockPlaySound.mockClear());

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach((tree) => tree.unmount());
  });
  jest.useRealTimers();
});

describe('picking one', () => {
  it('has four to choose from', () => {
    const seen = new Set([0, 0.3, 0.6, 0.9].map((p) => missFor(() => p)));
    expect(seen.size).toBe(4);
  });

  it('gives every one of them a sound', () => {
    for (const p of [0, 0.3, 0.6, 0.9]) {
      expect(MISS_SOUND[missFor(() => p)]).toMatch(/^miss-/);
    }
  });

  it('copes with a pick at the very top of its range', () => {
    expect(missFor(() => 0.9999999)).toBeTruthy();
  });
});

describe('in a round', () => {
  it('shows one for a wrong answer', () => {
    const tree = quiz([question('a'), question('b')]);
    expect(tree.root.findByType(MissFeedback).props.kind).toBeNull();
    answer(tree, '54');
    expect(tree.root.findByType(MissFeedback).props.kind).not.toBeNull();
  });

  it('shows none for a right one', () => {
    const tree = quiz([question('a'), question('b')]);
    answer(tree, '56');
    expect(tree.root.findByType(MissFeedback).props.kind).toBeNull();
  });

  /** Unlike praise, this is not rationed by speed — being slow is not the point. */
  it('shows one however long the answer took', () => {
    jest.useFakeTimers();
    try {
      const tree = quiz([question('a'), question('b')]);
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      answer(tree, '54');
      expect(tree.root.findByType(MissFeedback).props.kind).not.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('never shows praise and a miss at once', () => {
    const tree = quiz([question('a'), question('b'), question('c')]);
    answer(tree, '54');
    expect(tree.root.findByType(Celebration).props.kind).toBeNull();
    expect(tree.root.findByType(MissFeedback).props.kind).not.toBeNull();
  });

  it('replays for a second wrong answer', () => {
    const tree = quiz([question('a'), question('b'), question('c')]);
    answer(tree, '54');
    const first = tree.root.findByType(MissFeedback).props.nonce;
    answer(tree, '48');
    expect(tree.root.findByType(MissFeedback).props.nonce).toBeGreaterThan(first);
  });
});

describe('the sound', () => {
  it('plays a miss sound for a wrong answer', () => {
    const tree = quiz([question('a'), question('b')]);
    answer(tree, '54');
    expect(mockPlaySound).toHaveBeenCalledTimes(1);
    expect(mockPlaySound.mock.calls[0][0]).toMatch(/^miss-/);
  });

  it('plays a praise sound for a quick right answer', () => {
    const tree = quiz([question('a'), question('b')]);
    answer(tree, '56');
    expect(mockPlaySound).toHaveBeenCalledTimes(1);
    expect(mockPlaySound.mock.calls[0][0]).not.toMatch(/^miss-/);
  });

  it('stays silent on a slow right answer, like the animation does', () => {
    jest.useFakeTimers();
    try {
      const tree = quiz([question('a'), question('b')]);
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      answer(tree, '56');
      expect(mockPlaySound).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('the component', () => {
  it('draws nothing when there is nothing to show', () => {
    expect(render(<MissFeedback kind={null} nonce={0} />).toJSON()).toBeNull();
  });

  it('draws all four kinds without falling over', () => {
    for (const kind of ['wobble', 'puff', 'ripple', 'drift'] as const) {
      const tree = render(<MissFeedback kind={kind} nonce={2} />);
      expect(tree.toJSON()).not.toBeNull();
      act(() => tree.unmount());
    }
  });

  it('lets touches through to the question behind it', () => {
    const tree = render(<MissFeedback kind="puff" nonce={1} />);
    expect(
      tree.root.findAll((n) => typeof n.type !== 'string' && n.props.pointerEvents === 'none')
        .length,
    ).toBeGreaterThan(0);
  });

  /** Nothing here should read as punishment: no red, no cross. */
  it('says something kind rather than marking it wrong', () => {
    const words = ['wobble', 'puff', 'ripple', 'drift'].map((kind) => {
      const tree = render(<MissFeedback kind={kind as never} nonce={1} />);
      const text = JSON.stringify(tree.toJSON());
      act(() => tree.unmount());
      return text;
    });
    for (const text of words) {
      expect(text).not.toContain('Wrong');
      expect(text).not.toContain('✗');
      expect(text).not.toContain('❌');
    }
  });
});
