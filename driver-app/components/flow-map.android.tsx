import { Camera, type CameraRef, GeoJSONSource, Layer, Map, Marker, UserLocation } from '@maplibre/maplibre-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, Icon, radius, shadow, space, Text } from '@/design';
import { MAP_ATTRIBUTION, mapStyle } from '@/config/maps';
import type { FlowMapProps, LatLng, MapPin } from './flow-map.types';

export type { FlowMapProps, LatLng, MapPin } from './flow-map.types';

// Android: MapLibre with OpenStreetMap data (style from config/maps.ts), so no
// Google Maps key is needed. Pins with `animate` glide to new positions, for
// live tracking.

const zoomFor = (delta: number) => Math.max(3, Math.min(18, Math.round(Math.log2(360 / delta))));
const GLIDE_MS = 1000;

// Moves animated pins smoothly from where they were to where they are now.
function useGlidingPins(pins: MapPin[]): MapPin[] {
  const [shown, setShown] = useState(pins);
  const from = useRef(new globalThis.Map<string, LatLng>());
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    const starts = pins.map((p) => (p.animate ? from.current.get(p.id) : undefined) ?? p);
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / GLIDE_MS);
      const ease = t * (2 - t);
      const now = pins.map((p, i) => ({
        ...p,
        latitude: starts[i].latitude + (p.latitude - starts[i].latitude) * ease,
        longitude: starts[i].longitude + (p.longitude - starts[i].longitude) * ease,
      }));
      setShown(now);
      now.forEach((p) => from.current.set(p.id, p));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    if (frame.current) cancelAnimationFrame(frame.current);
    step();
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [pins]);

  return shown;
}

function PinView({ pin }: { pin: MapPin }) {
  if (pin.kind === 'car') {
    return (
      <View style={[styles.car, { transform: [{ rotate: `${pin.heading ?? 0}deg` }] }]}>
        <Icon name="navigation" size={16} color={colors.onDark} />
      </View>
    );
  }
  return <View style={[styles.pin, { backgroundColor: pin.color ?? colors.ink }]} />;
}

export default function FlowMap({
  style, center, delta = 0.01, pins = [], userLocation, onPinPress,
  route, fitTo, followUser, onPress, controls = true, insets,
}: FlowMapProps) {
  const top = insets?.top ?? 0;
  const bottom = insets?.bottom ?? 0;
  const camera = useRef<CameraRef>(null);
  const zoom = useRef(zoomFor(delta));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mapStyleValue = useMemo(() => mapStyle(), []);
  const shownPins = useGlidingPins(pins);

  // The route goes under the blue dot, not over it.
  const showUser = userLocation !== undefined;
  const underDot = showUser ? 'mlrn-user-location-puck-white' : undefined;
  const routeShape = useMemo(
    () => (route && route.length > 1
      ? { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: route.map(([lat, lng]) => [lng, lat]) } }
      : null),
    [route],
  );

  // Frame the given points, or follow the centre.
  const bounds = useMemo(() => {
    if (!fitTo || fitTo.length < 2) return null;
    const lats = fitTo.map((p) => p.latitude);
    const lngs = fitTo.map((p) => p.longitude);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] as [number, number, number, number];
  }, [fitTo]);
  const stop = followUser
    ? {}
    : bounds
      ? { bounds, padding: { top: top + 60, right: 40, bottom: bottom + 60, left: 40 }, duration: 600 }
      : { center: [center.longitude, center.latitude] as [number, number], zoom: zoomFor(delta), padding: { top, right: 0, bottom, left: 0 }, duration: 600 };

  if (!mapStyleValue) {
    return (
      <View style={[style, styles.message]}>
        <Icon name="map" size={28} color={colors.muted} />
        <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>Map is not set up in this build</Text>
      </View>
    );
  }

  const recenter = () => {
    const here = userLocation ?? center;
    camera.current?.easeTo({
      center: [here.longitude, here.latitude], zoom: Math.max(zoom.current, 15),
      padding: { top, right: 0, bottom, left: 0 }, duration: 500,
    });
  };
  const zoomBy = (d: number) => camera.current?.zoomTo(zoom.current + d, { duration: 250 });

  return (
    <View style={style}>
      <Map
        key={attempt}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyleValue}
        attribution={false}
        logo={false}
        compass={false}
        onRegionDidChange={(e) => {
          zoom.current = e.nativeEvent.zoom;
        }}
        onPress={onPress ? (e) => {
          const [longitude, latitude] = e.nativeEvent.lngLat;
          onPress({ latitude, longitude });
        } : undefined}
        onDidFailLoadingMap={() => setFailed(true)}
        onDidFinishLoadingMap={() => setFailed(false)}
      >
        <Camera
          ref={camera}
          {...stop}
          trackUserLocation={followUser ? 'course' : undefined}
          initialViewState={{ center: [center.longitude, center.latitude], zoom: zoomFor(delta) }}
        />
        {routeShape && (
          <GeoJSONSource id="flow-route" data={routeShape}>
            <Layer id="flow-route-casing" type="line" beforeId={underDot} layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': colors.onDark, 'line-width': 8 }} />
            <Layer id="flow-route-line" type="line" beforeId={underDot} layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': colors.ink, 'line-width': 5 }} />
          </GeoJSONSource>
        )}
        {showUser && <UserLocation heading={Boolean(followUser)} />}
        {shownPins.map((p) => (
          <Marker key={p.id} id={p.id} lngLat={[p.longitude, p.latitude]} anchor="center"
            onPress={onPinPress ? () => onPinPress(p.id) : undefined}>
            <PinView pin={p} />
          </Marker>
        ))}
      </Map>

      {controls && (
        <View style={[styles.controls, { bottom: bottom + 28 }]} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" style={styles.control} onPress={() => zoomBy(1)}>
            <Icon name="plus" size={18} color={colors.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" style={styles.control} onPress={() => zoomBy(-1)}>
            <Icon name="minus" size={18} color={colors.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Show my position" style={styles.control} onPress={recenter}>
            <Icon name="crosshair" size={18} color={colors.ink} />
          </Pressable>
        </View>
      )}

      {failed && (
        <Pressable style={styles.failed} onPress={() => { setFailed(false); setAttempt((n) => n + 1); }}>
          <Text variant="caption" color={colors.onDark}>Map could not load. Check your connection, then tap to retry.</Text>
        </Pressable>
      )}

      {/* Required by the OpenStreetMap licence: always visible. */}
      <View style={[styles.attribution, { bottom: bottom + 4 }]} pointerEvents="none">
        <Text style={styles.attributionText}>{MAP_ATTRIBUTION}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  message: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft2 },
  pin: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: colors.onDark, ...shadow.card },
  car: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.onDark,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
  controls: { position: 'absolute', right: space.md, gap: space.sm },
  control: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
  failed: { position: 'absolute', left: space.md, right: space.md, top: space.md, backgroundColor: colors.ink, borderRadius: radius.md, padding: space.md },
  attribution: { position: 'absolute', right: 4, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  attributionText: { fontSize: 10, color: '#333' },
});
