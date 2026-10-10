import Constants, { ExecutionEnvironment } from 'expo-constants';
import type React from 'react';
import type { FlowMapProps } from './flow-map.types';

export type { FlowMapProps, LatLng, MapPin } from './flow-map.types';

// Android: MapLibre in installed builds (development, preview, production).
// Expo Go has no MapLibre, so there the map is Leaflet in a WebView, with the
// same OpenStreetMap data and the same props.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/* eslint-disable @typescript-eslint/no-require-imports */
const FlowMap: React.ComponentType<FlowMapProps> = inExpoGo
  ? require('./flow-map.webview').default
  : require('./flow-map.maplibre').default;
/* eslint-enable @typescript-eslint/no-require-imports */

export default FlowMap;
