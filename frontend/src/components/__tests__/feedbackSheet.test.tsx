/**
 * The suggestion and bug-report form.
 *
 * What matters on screen: the send button cannot be pressed with nothing
 * written, it cannot be pressed twice, a failure says what went wrong without
 * throwing away what was typed, and reopening the sheet does not show the
 * last thing sent as though it had failed.
 */

import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../lib/feedback', () => ({
  feedbackAvailable: () => true,
  sendFeedback: jest.fn(),
}));

import FeedbackSheet from '../FeedbackSheet';
import { sendFeedback } from '../../lib/feedback';
import { Grade } from '../../types';

const send = sendFeedback as jest.Mock;

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(element);
  });
  return tree;
}

const textOf = (tree: ReactTestRenderer): string => {
  const walk = (node: unknown): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(walk).join('');
    if (node && typeof node === 'object' && 'children' in node) {
      return `${walk((node as { children: unknown }).children)} `;
    }
    return '';
  };
  return walk(tree.toJSON());
};

const at = (tree: ReactTestRenderer, label: string) =>
  tree.root.find((n) => n.props.accessibilityLabel === label);

/**
 * A tap, as a real one behaves: a disabled Pressable ignores it. Calling
 * `onPress` straight off the node would press right through the thing the
 * disabled state exists to prevent, and the test would pass on a broken form.
 */
const press = (tree: ReactTestRenderer, label: string): void => {
  const node = at(tree, label);
  if (node.props.disabled === true) return;
  act(() => node.props.onPress());
};

/** Presses and lets the send promise settle. */
const pressAndSettle = async (tree: ReactTestRenderer, label: string): Promise<void> => {
  const node = at(tree, label);
  if (node.props.disabled === true) return;
  await act(async () => {
    node.props.onPress();
  });
};

const type = (tree: ReactTestRenderer, kindLabel: string, text: string): void => {
  act(() => at(tree, kindLabel).props.onChangeText(text));
};

/** Trees are unmounted after each test so the auto-close timer cannot outlive it. */
const mounted: ReactTestRenderer[] = [];

afterEach(() => {
  for (const tree of mounted.splice(0)) act(() => tree.unmount());
});

const sheet = (kind: 'suggestion' | 'bug' = 'suggestion', onClose = jest.fn()) => {
  const tree = render(
    <FeedbackSheet
      visible
      kind={kind}
      profileId="kid-1"
      gradeFor={() => 2 as Grade}
      onClose={onClose}
    />,
  );
  mounted.push(tree);
  return { tree, onClose };
};

const FORM = { suggestion: 'Suggest a kind of problem', bug: 'Report a problem' };
const SEND = { suggestion: 'Send suggestion', bug: 'Send report' };

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ ok: true });
});

describe('what it asks for', () => {
  it('uses the words of the kind it was opened for', () => {
    const { tree } = sheet('bug');
    expect(textOf(tree)).toContain('Report a problem');
    expect(textOf(tree)).not.toContain('Send suggestion');
  });

  it('will not send an empty form', () => {
    const { tree } = sheet();
    press(tree, SEND.suggestion);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends what was typed, with the child and their grade', async () => {
    const { tree } = sheet();
    type(tree, FORM.suggestion, 'Clocks with hands');
    press(tree, 'Maths');
    await pressAndSettle(tree, SEND.suggestion);
    expect(send).toHaveBeenCalledWith({
      kind: 'suggestion',
      message: 'Clocks with hands',
      subject: 'math',
      grade: 2,
      profileId: 'kid-1',
    });
  });

  it('lets a subject be unpicked, for something that spans them', async () => {
    const { tree } = sheet();
    type(tree, FORM.suggestion, 'Everything is too easy');
    press(tree, 'Reading');
    press(tree, 'Reading, chosen');
    await pressAndSettle(tree, SEND.suggestion);
    expect(send.mock.calls[0][0]).toMatchObject({ subject: undefined, grade: undefined });
  });
});

describe('after sending', () => {
  it('says thank you and closes itself', async () => {
    jest.useFakeTimers();
    try {
      const { tree, onClose } = sheet();
      type(tree, FORM.suggestion, 'Clocks');
      await pressAndSettle(tree, SEND.suggestion);
      expect(textOf(tree)).toContain('Thank you');
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(onClose).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  /** Two taps would file the same report twice. */
  it('cannot be sent a second time', async () => {
    const { tree } = sheet();
    type(tree, FORM.suggestion, 'Clocks');
    await pressAndSettle(tree, SEND.suggestion);
    press(tree, SEND.suggestion);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('shows why it failed and keeps what was typed', async () => {
    send.mockResolvedValue({ ok: false, reason: 'Could not reach the server.' });
    const { tree } = sheet();
    type(tree, FORM.suggestion, 'Clocks with hands');
    await pressAndSettle(tree, SEND.suggestion);
    expect(textOf(tree)).toContain('Could not reach the server.');
    expect(at(tree, FORM.suggestion).props.value).toBe('Clocks with hands');
  });

  it('lets a failed send be retried', async () => {
    send.mockResolvedValue({ ok: false, reason: 'Offline.' });
    const { tree } = sheet();
    type(tree, FORM.suggestion, 'Clocks');
    await pressAndSettle(tree, SEND.suggestion);

    send.mockResolvedValue({ ok: true });
    await pressAndSettle(tree, SEND.suggestion);
    expect(send).toHaveBeenCalledTimes(2);
    expect(textOf(tree)).toContain('Thank you');
  });
});

describe('reopening', () => {
  it('starts empty rather than showing the last thing sent', async () => {
    const { tree } = sheet();
    type(tree, FORM.suggestion, 'Clocks');
    await pressAndSettle(tree, SEND.suggestion);

    const close = (visible: boolean) => (
      <FeedbackSheet
        visible={visible}
        kind="suggestion"
        gradeFor={() => 2 as Grade}
        onClose={jest.fn()}
      />
    );
    act(() => tree.update(close(false)));
    act(() => tree.update(close(true)));

    expect(textOf(tree)).not.toContain('Thank you');
    expect(at(tree, FORM.suggestion).props.value).toBe('');
  });
});
