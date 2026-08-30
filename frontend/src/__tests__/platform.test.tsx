/**
 * What has to hold on each platform separately.
 *
 * The suite runs this file twice — once under `jest-expo/ios` and once under
 * `jest-expo/android` — so `Platform.OS` is genuinely different between the
 * two runs rather than mocked. Everything asserted here is something that
 * either differs by platform or has, at some point, only been checked on the
 * platform the app happened to be developed on.
 *
 * Generic behaviour does NOT belong here: it lives in the `logic` project and
 * runs once. This file is for the seams where the two platforms part ways.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { Path } from 'react-native-svg';
import App from '../../App';
import ScratchPad from '../components/ScratchPad';
import { updaterConfig } from '../content';
import { checkForUpdate } from '../content/updater';
import { ERASER_BUTTONS } from '../lib/scratch';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

/** Which run this is. Both branches are exercised, one per project. */
const OS = Platform.OS as 'ios' | 'android';

describe(`${OS}: talking to the content server`, () => {
  it('tells the server which platform is asking', () => {
    // The server may ship different packs per platform, so this tag has to be
    // right on both — and it is the one line in the app that reads Platform.
    expect(updaterConfig().platform).toBe(OS);
  });

  it('carries the platform through to the manifest request', async () => {
    const requests: string[] = [];
    const realFetch = global.fetch;
    global.fetch = (async (url: string) => {
      requests.push(String(url));
      return new Response(
        JSON.stringify({
          manifestVersion: 1,
          generatedAt: '2026-08-29T00:00:00.000Z',
          minSupportedApp: '1.0.0',
          packs: [],
        }),
        { status: 200, headers: { etag: '"v1"', 'content-type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    try {
      await checkForUpdate(
        { ...updaterConfig(), baseUrl: 'https://content.test' },
        { force: true },
      );
    } finally {
      global.fetch = realFetch;
    }

    expect(requests[0]).toContain(`platform=${OS}`);
  });
});

/* ------------------------------------------------------------------ paper -- */

let pointer = 0;
const event = (x: number, y: number, pointerType: string, id: number, buttons = 0) => ({
  nativeEvent: { offsetX: x, offsetY: y, pointerId: id, pointerType, buttons },
});

const paper = (tree: ReactTestRenderer): ReactTestInstance =>
  tree.root.findAll(
    (n) => typeof n.type === 'string' && n.props.onPointerDown !== undefined,
  )[0];

const draw = (
  tree: ReactTestRenderer,
  points: [number, number][],
  pointerType: string,
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

const paths = (tree: ReactTestRenderer) => tree.root.findAllByType(Path);

/**
 * A pad, torn down when the test ends. The paper measures itself on layout,
 * so a tree left mounted goes on updating after the run has finished.
 */
let mounted: ReactTestRenderer[] = [];
const pad = (penOnly: boolean): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<ScratchPad penOnly={penOnly} />);
  });
  mounted.push(tree);
  return tree;
};

/**
 * The scratch paper is the most platform-dependent thing in the app: it is
 * driven by pointer events, which Android only sends at all because
 * `plugins/withPointerEvents.js` turns them on, and whose `buttons` field
 * carries Android's MotionEvent constants rather than the web's. iOS sends
 * them natively and an Apple Pencil has no side button to report.
 */
describe(`${OS}: the scratch paper`, () => {
  afterEach(() => {
    act(() => mounted.forEach((tree) => tree.unmount()));
    mounted = [];
  });

  it('draws with a pen on either platform', () => {
    const tree = pad(true);
    draw(tree, [[10, 10], [40, 40], [70, 70]], 'pen');
    expect(paths(tree).length).toBeGreaterThan(0);
  });

  it('ignores a resting hand when the pen is the only thing allowed', () => {
    const tree = pad(true);
    draw(tree, [[10, 10], [40, 40], [70, 70]], 'touch');
    expect(paths(tree)).toHaveLength(0);
  });

  it('takes a fingertip on a tablet with no pen', () => {
    const tree = pad(false);
    draw(tree, [[10, 10], [40, 40], [70, 70]], 'touch');
    expect(paths(tree).length).toBeGreaterThan(0);
  });

  if (OS === 'android') {
    it("erases with the pen's side button, which only Android reports", () => {
      const tree = pad(true);
      draw(tree, [[10, 10], [40, 40], [70, 70]], 'pen');
      const drawn = paths(tree).length;
      expect(drawn).toBeGreaterThan(0);

      // The same stroke again with the side button held rubs out instead.
      draw(tree, [[10, 10], [40, 40], [70, 70]], 'pen', ERASER_BUTTONS);
      expect(paths(tree).length).toBeLessThan(drawn);
    });
  } else {
    it('draws with an Apple Pencil, which reports no buttons at all', () => {
      // iOS never sends Android's button bitmask, so a pencil stroke arrives
      // with buttons: 0 and must be treated as writing, not as erasing.
      const tree = pad(true);
      draw(tree, [[10, 10], [40, 40], [70, 70]], 'pen', 0);
      expect(paths(tree).length).toBeGreaterThan(0);
    });
  }
});

/* -------------------------------------------------------------------- app -- */

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe(`${OS}: the app itself`, () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  it('renders its home screen', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<App />);
    });
    await flush();

    const walk = (node: unknown): string => {
      if (typeof node === 'string') return node;
      if (Array.isArray(node)) return node.map(walk).join('');
      if (node && typeof node === 'object' && 'children' in node) {
        return `${walk((node as { children: unknown }).children)} `;
      }
      return '';
    };
    const text = walk(tree.toJSON());

    expect(text).toContain('Boring Quest');
    expect(text).toContain('Math');
    expect(text).toContain('Reading');
    expect(text).toContain('Logic');
    // Free practice — the adaptive half — has to be reachable on both.
    expect(text).toContain('Free practice');
  });
});
