// Web builds only (see metro.config.js): react-native-maps has no web
// version, so the map becomes a plain grey panel there. Phones get the real map.
const React = require('react');
const { View, Text } = require('react-native');

function MapView({ style, children }) {
  return React.createElement(
    View,
    { style: [{ backgroundColor: '#E8E8EC', alignItems: 'center', justifyContent: 'center' }, style] },
    React.createElement(Text, { style: { color: '#71717A' } }, 'Map (on phones)'),
  );
}
const Nothing = () => null;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Nothing;
module.exports.Polyline = Nothing;
module.exports.Circle = Nothing;
module.exports.PROVIDER_GOOGLE = 'google';
