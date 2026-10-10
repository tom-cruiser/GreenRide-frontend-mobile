import type { StyleProp, ViewStyle } from 'react-native';

export type LatLng = { latitude: number; longitude: number };

export type MapPin = LatLng & {
  id: string;
  title?: string;
  description?: string;
  color?: string;
  // 'car' draws a car that turns with `heading` (degrees from north).
  kind?: 'pin' | 'car';
  heading?: number | null;
  // Glide to each new position instead of jumping (live tracking).
  animate?: boolean;
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
  // Android (MapLibre) only, ignored on iOS:
  // a route to draw, as [lat, lng] points,
  route?: [number, number][] | null;
  // frame these points instead of `center` (e.g. a route preview),
  fitTo?: LatLng[] | null;
  // keep the camera on the phone, turned the way it moves (navigation),
  followUser?: boolean;
  // a tap on the map (pick a point),
  onPress?: (point: LatLng) => void;
  // zoom and recenter buttons (default on),
  controls?: boolean;
  // space covered by panels drawn over the map (px): the centre, the buttons
  // and the OpenStreetMap credit stay in the visible part.
  insets?: { top?: number; bottom?: number };
};
