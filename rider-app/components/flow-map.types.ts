import type { StyleProp, ViewStyle } from 'react-native';

export type LatLng = { latitude: number; longitude: number };

export type MapPin = LatLng & {
  id: string;
  title?: string;
  description?: string;
  color?: string;
};

export type FlowMapProps = {
  style?: StyleProp<ViewStyle>;
  // The map follows this point: it re-centres whenever it changes.
  center: LatLng;
  // How much of the map shows around the centre, in degrees (0.01 ≈ a few streets).
  delta?: number;
  pins?: MapPin[];
  // The phone's own position, drawn as a dot (live on iOS).
  userLocation?: LatLng | null;
  onPinPress?: (id: string) => void;
};
