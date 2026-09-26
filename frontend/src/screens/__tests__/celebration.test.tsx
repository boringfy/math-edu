/**
 * Celebrations on screen.
 *
 * The behaviour that matters: a quick correct answer sets one off, a wrong
 * one never does however fast it was, and a slow correct one is left alone —
 * that last is what stops the absence of a celebration from meaning "wrong".
 */

import { act, create, ReactTestRenderer } from 'react-test-renderer';
import Celebration, { piecesOf } from '../../components/Celebration';
import { pieceSlice } from '../../lib/anim';
import QuizScreen from '../QuizScreen';
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

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach((tree) => tree.unmount());
  });
  jest.useRealTimers();
});

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
  const button = tree.root.find(
    (n) => typeof n.type !== 'string' && n.props.label === label,
  );
  act(() => button.props.onPress(label));
};

const kindOf = (tree: ReactTestRenderer): string | null =>
  tree.root.findByType(Celebration).props.kind;

describe('what sets one off', () => {
  it('celebrates a quick correct answer', () => {
    const tree = quiz([question('a'), question('b')]);
    expect(kindOf(tree)).toBeNull();
    answer(tree, '56');
    expect(kindOf(tree)).not.toBeNull();
  });

  it('never celebrates a wrong answer, however fast', () => {
    const tree = quiz([question('a'), question('b')]);
    answer(tree, '54');
    expect(kindOf(tree)).toBeNull();
  });

  it('leaves a slow correct answer alone', () => {
    jest.useFakeTimers();
    try {
      const tree = quiz([question('a'), question('b')]);
      // Well past the twelve seconds a tap-to-answer question is allowed.
      act(() => {
        jest.advanceTimersByTime(20_000);
      });
      answer(tree, '56');
      // Silence here is what keeps silence ambiguous between slow and wrong.
      expect(kindOf(tree)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('replays for a second quick answer', () => {
    const tree = quiz([question('a'), question('b'), question('c')]);
    answer(tree, '56');
    const first = tree.root.findByType(Celebration).props.nonce;
    answer(tree, '56');
    expect(tree.root.findByType(Celebration).props.nonce).toBeGreaterThan(first);
  });
});

describe('the component itself', () => {
  it('draws nothing at all when there is nothing to celebrate', () => {
    const tree = render(<Celebration kind={null} nonce={0} />);
    expect(tree.toJSON()).toBeNull();
  });

  it('draws every kind without falling over', () => {
    for (const kind of ['sparkle', 'confetti', 'stars', 'fireworks', 'rocket'] as const) {
      const tree = render(<Celebration kind={kind} nonce={3} />);
      expect(tree.toJSON()).not.toBeNull();
      act(() => tree.unmount());
    }
  });

  it('is the same shape for the same nonce, and different for another', () => {
    const a = render(<Celebration kind="confetti" nonce={7} />);
    const b = render(<Celebration kind="confetti" nonce={7} />);
    const c = render(<Celebration kind="confetti" nonce={8} />);
    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
    expect(JSON.stringify(c.toJSON())).not.toBe(JSON.stringify(a.toJSON()));
  });

  it('lets touches through to the question behind it', () => {
    const tree = render(<Celebration kind="fireworks" nonce={1} />);
    const overlay = tree.root.findAll(
      (n) => typeof n.type !== 'string' && n.props.pointerEvents === 'none',
    );
    expect(overlay.length).toBeGreaterThan(0);
  });
});

describe('the driver slices every piece runs on', () => {
  /**
   * The bug this pins: a piece with no delay used to build an interpolation
   * with an input range of [0, 0, 1]. That is not increasing, the native
   * driver accepts it silently, and the entire burst then renders nothing —
   * with no error in logcat and every unit test still passing, because the
   * tree is built correctly and only the animated output is dead.
   */
  it('never builds a range that does not increase', () => {
    const bad: string[] = [];
    for (const kind of ['sparkle', 'confetti', 'stars', 'fireworks', 'rocket'] as const) {
      for (const nonce of [1, 2, 7, 99]) {
        for (const piece of piecesOf(kind, nonce)) {
          const slice = pieceSlice(piece.delay, 1100);
          if (slice === null) continue;
          const [a, b, c] = slice;
          if (!(a < b && b < c)) bad.push(`${kind}/${nonce}: ${slice.join(',')}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('hands an undelayed piece the driver itself', () => {
    expect(pieceSlice(0, 1100)).toBeNull();
  });

  it('slices a delayed piece into an increasing range', () => {
    expect(pieceSlice(220, 1100)).toEqual([0, 0.2, 1]);
  });

  /** Every kind must have at least one piece moving from the very start. */
  it('starts each kind immediately rather than all on a delay', () => {
    for (const kind of ['sparkle', 'confetti', 'stars', 'fireworks', 'rocket'] as const) {
      const earliest = Math.min(...piecesOf(kind, 5).map((p) => p.delay));
      expect(earliest).toBeLessThan(120);
    }
  });
});
