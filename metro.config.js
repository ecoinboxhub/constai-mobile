const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.hermesParser = true;
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  mangle: true,
  compress: {
    ...(config.transformer.minifierConfig?.compress ?? {}),
    dead_code: true,
    drop_console: true,
    drop_debugger: true,
    pure_funcs: ["console.log", "console.warn", "console.info"],
  },
  output: { comments: false },
};

config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs"];

module.exports = config;
