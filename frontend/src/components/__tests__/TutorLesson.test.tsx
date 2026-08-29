import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Question } from '../../types';
import TutorLesson from '../TutorLesson';

/**
 * The manual mock next to node_modules, reached through require so the test
 * helpers on it are visible — they are deliberately absent from the real
 * module's types.
 */
const speech = require('expo-speech') as {
  speak: jest.Mock;
  stop: jest.Mock;
  __finishSpeaking: () => void;
  __reset: () => void;
};

const question: Question = {
  id: 'boring-quest-v1/math.g3:fractions:2#1',
  prompt: 'Which is bigger, 1/2 or 1/4?',
  correctAnswer: '1/2',
  choices: ['1/2', '1/4', 'they are equal', 'cannot tell'],
  explanation: '1/2 > 1/4',
  answerFormat: null,
  mode: 'choice',
};

const LESSON = ['Cut a pizza in two.', 'Now cut one in four.', 'The half is bigger.'];

function textOf(tree: ReactTestRenderer): string {
  const walk = (node: unknown): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(walk).join('');
    if (node && typeof node === 'object' && 'children' in node) {
      return walk((node as { children: unknown }).children);
    }
    return '';
  };
  return walk(tree.toJSON());
}

const render = async (onClose: () => void = () => {}): Promise<ReactTestRenderer> => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<TutorLesson question={question} grade={3} onClose={onClose} />);
  });
  return tree;
};

/** Lets the queued voice line finish and the between-step pause elapse. */
const finishStep = async () => {
  await act(async () => {
    speech.__finishSpeaking();
    jest.runOnlyPendingTimers();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  speech.__reset();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('TutorLesson', () => {
  it('thinks while the lesson is being fetched', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));
    const tree = await render();
    expect(textOf(tree)).toContain('let me think');
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('speaks the steps one at a time, in the fraction lesson dress', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ steps: LESSON }) } as Response);

    const tree = await render();
    // Pizza, because the question id says fractions.
    expect(textOf(tree)).toContain('Pizza pieces!');

    // Step one is on screen and being spoken; step two has not appeared.
    expect(textOf(tree)).toContain(LESSON[0]);
    expect(textOf(tree)).not.toContain(LESSON[1]);
    expect(speech.speak).toHaveBeenCalledWith(LESSON[0], expect.anything());

    await finishStep();
    expect(textOf(tree)).toContain(LESSON[1]);

    await finishStep();
    await finishStep();
    // The lesson is over: every step still visible, and a way to hear it again.
    expect(textOf(tree)).toContain(LESSON[2]);
    expect(textOf(tree)).toContain('Hear it again');
  });

  it('offers to try again when the tutor cannot be reached', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    const tree = await render();
    expect(textOf(tree)).toContain('try once more');
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('goes quiet the moment it is closed', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ steps: LESSON }) } as Response);
    const onClose = jest.fn();
    const tree = await render(onClose);

    const close = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Close the helper',
    )[0];
    await act(async () => {
      close.props.onPress();
    });

    expect(speech.stop).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
