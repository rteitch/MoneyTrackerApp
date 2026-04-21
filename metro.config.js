const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Add .wasm to assetExts for expo-sqlite support on Web
config.resolver.assetExts.push('wasm');

// 2. Inject security headers for SharedArrayBuffer (needed by expo-sqlite on Web)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
