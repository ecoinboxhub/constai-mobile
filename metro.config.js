const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    minifierConfig: {
      mangle: { toplevel: true },
      compress: { drop_console: true, drop_debugger: true, passes: 2 },
      output: { ascii_only: true, comments: false },
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
