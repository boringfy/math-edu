const { withAppDelegate, withMainApplication } = require('@expo/config-plugins');

/**
 * Turns on React Native's W3C pointer events on Android and iOS.
 *
 * They are the only touch events that say what did the touching — a finger,
 * a palm or a stylus — which is what the scratch paper needs to ignore the
 * hand a child rests on the screen while writing with a pen. React Native
 * ships them behind native flags that default to off. Both native folders are
 * generated, so the switches are flipped here rather than by hand.
 */

const IMPORT = 'import com.facebook.react.config.ReactFeatureFlags';
const ENABLE = 'ReactFeatureFlags.dispatchPointerEvents = true';
const ANCHOR = 'import com.facebook.react.ReactPackage';
const IOS_ENABLE = 'RCTSetDispatchW3CPointerEvents(true)';
const IOS_ANCHOR = 'let delegate = ReactNativeDelegate()';

module.exports = function withPointerEvents(config) {
  config = withMainApplication(config, (config) => {
    if (config.modResults.language !== 'kt') {
      throw new Error('withPointerEvents expects a Kotlin MainApplication');
    }

    let contents = config.modResults.contents;

    if (!contents.includes(IMPORT)) {
      if (!contents.includes(ANCHOR)) {
        throw new Error(`withPointerEvents could not find "${ANCHOR}" to import beside`);
      }
      contents = contents.replace(ANCHOR, `${IMPORT}\n${ANCHOR}`);
    }

    if (!contents.includes(ENABLE)) {
      const onCreate = 'super.onCreate()';
      if (!contents.includes(onCreate)) {
        throw new Error('withPointerEvents could not find onCreate to flip the flag in');
      }
      contents = contents.replace(
        onCreate,
        `${onCreate}\n    // Pointer events carry the tool type, which the scratch paper\n` +
          `    // needs so a resting palm cannot draw. See plugins/withPointerEvents.js.\n` +
          `    ${ENABLE}`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withPointerEvents expects a Swift AppDelegate');
    }

    let contents = config.modResults.contents;
    if (!contents.includes(IOS_ENABLE)) {
      if (!contents.includes(IOS_ANCHOR)) {
        throw new Error(`withPointerEvents could not find "${IOS_ANCHOR}" in AppDelegate`);
      }
      // React Native defaults this flag to off. Enable it before Fabric
      // creates its touch handler, so iOS can tell Apple Pencil from finger.
      contents = contents.replace(IOS_ANCHOR, `${IOS_ENABLE}\n    ${IOS_ANCHOR}`);
    }
    config.modResults.contents = contents;
    return config;
  });
};
