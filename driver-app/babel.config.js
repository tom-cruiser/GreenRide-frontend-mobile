module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Keep this last.
      'react-native-reanimated/plugin',
    ],
  };
};
