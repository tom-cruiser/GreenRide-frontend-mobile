import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import type { FlowMapProps } from './flow-map.types';

export type { FlowMapProps, LatLng, MapPin } from './flow-map.types';

// iOS: Apple Maps, no key needed.
export default function FlowMap({ style, center, delta = 0.01, pins = [], userLocation, onPinPress }: FlowMapProps) {
  return (
    <MapView
      style={style}
      region={{ ...center, latitudeDelta: delta, longitudeDelta: delta }}
      showsUserLocation={Boolean(userLocation)}
      showsMyLocationButton={false}
    >
      {pins.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.latitude, longitude: p.longitude }}
          title={p.title}
          description={p.description}
          pinColor={p.color}
          onPress={onPinPress ? () => onPinPress(p.id) : undefined}
        />
      ))}
    </MapView>
  );
}
