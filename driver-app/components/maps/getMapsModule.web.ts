import type { MapsModule } from './types';

export function getMapsModule(): MapsModule {
  // `react-native-maps` is not supported on web in this project.
  // Returning null avoids importing native-only modules during web bundling.
  return null;
}
