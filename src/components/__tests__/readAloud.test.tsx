import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Passage } from '../../types';
import ReadAloud from '../ReadAloud';

/**
 * The manual mock next to node_modules, reached through require so the test
 * helpers on it are visible — they are deliberately absent from the real
 * module's types.
 */
const speech = require('expo-speech-recognition') as {
  ExpoSpeechRecognitionModule: {
    start: jest.Mock;
    stop: jest.Mock;
    requestPermissionsAsync: jest.Mock;
    getSupportedLocales: jest.Mock;
  };
  __setAvailable: (value: boolean) => void;
  __emit: (name: string, event: unknown) => void;
  __reset: () => void;
};

/** Ten words, so each one read is worth exactly ten percent. */
const passage: Passage = {
  title: 'Counting',
  icon: '🔢',
  text: 'one two three four five six seven eight nine ten',
};

const render = async (): Promise<ReactTestRenderer> => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<ReadAloud passage={passage} />);
  });
  return tree;
};

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

/** Every pressable in the tree, in the order they are drawn. */
const buttons = (tree: ReactTestRenderer) =>
  tree.root.findAll((n) => typeof n.type !== 'string' && n.props.onPress !== undefined);

/** Taps the microphone button and lets the permission checks settle. */
const tapMic = async (tree: ReactTestRenderer) => {
  await act(async () => {
    buttons(tree)[0].props.onPress();
  });
};

/** Feeds the recogniser's output in, the way the native module would. */
const hear = async (transcript: string, isFinal = false) => {
  await act(async () => {
    speech.__emit('result', { isFinal, results: [{ transcript, confidence: 0.9 }] });
  });
};

beforeEach(() => speech.__reset());

describe('when the tablet cannot recognise speech on its own', () => {
  it('shows the story with no microphone anywhere in sight', async () => {
    speech.__setAvailable(false);
    const tree = await render();

    expect(textOf(tree)).toContain('one two three');
    expect(textOf(tree)).not.toContain('Read it out loud');
    expect(buttons(tree)).toHaveLength(0);
  });

  it('never starts listening, rather than falling back to the network', async () => {
    // The whole privacy claim rests on this: no on-device support means no
    // recognition at all, not cloud recognition.
    speech.__setAvailable(false);
    await render();
    expect(speech.ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
  });
});

describe('reading out loud', () => {
  beforeEach(() => speech.__setAvailable(true));

  it('offers the microphone once the device can listen offline', async () => {
    expect(textOf(await render())).toContain('Read it out loud');
  });

  it('listens on-device only, and tells the recogniser which words to expect', async () => {
    const tree = await render();
    await tapMic(tree);

    expect(speech.ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
    const options = speech.ExpoSpeechRecognitionModule.start.mock.calls[0][0];
    expect(options.requiresOnDeviceRecognition).toBe(true);
    expect(options.interimResults).toBe(true);
    expect(options.continuous).toBe(true);
    // The story's longer words are handed over as biasing hints.
    expect(options.contextualStrings).toContain('three');
    expect(options.contextualStrings).not.toContain('one');
  });

  it('lights the words up as they are heard', async () => {
    const tree = await render();
    await tapMic(tree);
    await hear('one two three');

    expect(textOf(tree)).toContain('30% of the words heard');
  });

  it('keeps what it already heard when a segment is finalised', async () => {
    // Android closes a segment and opens a fresh one; the earlier words must
    // not vanish when the next partial arrives.
    const tree = await render();
    await tapMic(tree);
    await hear('one two three', true);
    await hear('four five');

    expect(textOf(tree)).toContain('50% of the words heard');
  });

  it('passes the reading at sixty percent', async () => {
    const tree = await render();
    await tapMic(tree);
    await hear('one two three four five six');

    // Stop reading: the last button is the one that ends the session.
    const all = buttons(tree);
    await act(async () => {
      all[all.length - 1].props.onPress();
    });

    expect(speech.ExpoSpeechRecognitionModule.stop).toHaveBeenCalled();
    expect(textOf(tree)).toContain('Brilliant reading');
    expect(textOf(tree)).toContain('60%');
  });

  it('invites another go when too little was heard', async () => {
    const tree = await render();
    await tapMic(tree);
    await hear('one two three');

    const all = buttons(tree);
    await act(async () => {
      all[all.length - 1].props.onPress();
    });

    expect(textOf(tree)).toContain('30%');
    expect(textOf(tree)).toContain('another go');
  });

  it('does not warn about stopping when the reading already passed', async () => {
    // The recogniser routinely gives up just as the last line is finished;
    // a warning beside "Brilliant reading" reads as a failure that isn't one.
    const tree = await render();
    await tapMic(tree);
    await hear('one two three four five six seven');
    await act(async () => {
      speech.__emit('error', { error: 'client', message: 'stopped' });
    });

    expect(textOf(tree)).toContain('Brilliant reading');
    expect(textOf(tree)).not.toContain('stopped listening');
  });

  it('does warn when it stopped before enough was heard', async () => {
    const tree = await render();
    await tapMic(tree);
    await hear('one two');
    await act(async () => {
      speech.__emit('error', { error: 'client', message: 'stopped' });
    });

    expect(textOf(tree)).toContain('stopped listening');
  });

  it('carries on through a pause instead of giving up', async () => {
    // A child stopping to think raises no-speech; the session must survive it.
    const tree = await render();
    await tapMic(tree);
    await hear('one two');
    await act(async () => {
      speech.__emit('error', { error: 'no-speech', message: 'no speech' });
    });

    expect(textOf(tree)).toContain('Listening');
    expect(textOf(tree)).not.toContain('stopped listening');
  });

  it('starts a new turn when Android ends the last one mid-story', async () => {
    const tree = await render();
    await tapMic(tree);
    await act(async () => {
      speech.__emit('end', null);
    });

    expect(speech.ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(2);
  });

  it('says so plainly when the microphone is refused', async () => {
    speech.ExpoSpeechRecognitionModule.requestPermissionsAsync.mockResolvedValue({
      granted: false,
    });
    const tree = await render();
    await tapMic(tree);

    expect(textOf(tree)).toContain('needs the microphone');
    expect(speech.ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
  });

  it('waits for the offline words rather than listening over the network', async () => {
    speech.ExpoSpeechRecognitionModule.getSupportedLocales.mockResolvedValue({
      locales: ['en-US'],
      installedLocales: [],
    });
    const tree = await render();
    await tapMic(tree);

    expect(textOf(tree)).toContain('try again in a moment');
    expect(speech.ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
  });
});
