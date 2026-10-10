import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors, Icon, radius, shadow, space } from '@/design';
import { MAP_ATTRIBUTION } from '@/config/maps';
import type { FlowMapProps } from './flow-map.types';

export type { FlowMapProps, LatLng, MapPin } from './flow-map.types';

// Android inside Expo Go (no MapLibre there): OpenStreetMap tiles drawn by
// Leaflet in a WebView. Same props as the MapLibre map; pins, the route and
// the centre are pushed in without reloading, so live positions still move.
const TILE_URL = process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const zoomFor = (delta: number) => Math.max(3, Math.min(18, Math.round(Math.log2(360 / delta))));

const html = (tiles: string, attribution: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;background:#E5E7EB}.leaflet-control-attribution{font-size:10px}</style>
</head><body><div id="map"></div><script>
var map = L.map('map', { zoomControl: false, attributionControl: true });
map.attributionControl.setPrefix(false);
L.tileLayer(${JSON.stringify(tiles)}, { maxZoom: 19, attribution: ${JSON.stringify(attribution)} }).addTo(map);
var pins = L.layerGroup().addTo(map), line = null, me = null, last = '';
function send(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
map.on('click', function (e) { send({ type: 'tap', lat: e.latlng.lat, lng: e.latlng.lng }); });
window.flowZoom = function (d) { map.setZoom(map.getZoom() + d); };
window.flowGo = function (lat, lng) { map.setView([lat, lng], Math.max(map.getZoom(), 15)); };
window.flowUpdate = function (s) {
  var pad = { paddingTopLeft: [40, s.top + 40], paddingBottomRight: [40, s.bottom + 40] };
  document.querySelector('.leaflet-bottom').style.bottom = s.bottom + 'px';
  var view = s.fit ? 'fit:' + JSON.stringify(s.fit) : 'c:' + s.center.lat + ',' + s.center.lng + ',' + s.zoom;
  if (s.follow || view !== last) {
    last = view;
    if (s.fit) map.fitBounds(s.fit, pad);
    else {
      map.setView([s.center.lat, s.center.lng], s.zoom, { animate: !!map._loaded });
      // Keep the centre in the part of the map not covered by panels.
      map.panBy([0, (s.bottom - s.top) / 2], { animate: false });
    }
  }
  pins.clearLayers();
  s.pins.forEach(function (p) {
    var m = L.circleMarker([p.lat, p.lng], { radius: p.car ? 11 : 9, color: '#fff', weight: 3, fillColor: p.color, fillOpacity: 1 }).addTo(pins);
    if (p.title || p.description) {
      var box = document.createElement('div'), t = document.createElement('b'), d = document.createElement('div');
      t.textContent = p.title || ''; d.textContent = p.description || ''; box.appendChild(t); box.appendChild(d);
      m.bindPopup(box);
    }
    m.on('click', function (e) { L.DomEvent.stopPropagation(e); send({ type: 'pin', id: p.id }); });
  });
  if (line) { map.removeLayer(line); line = null; }
  if (s.route && s.route.length > 1) line = L.polyline(s.route, { color: '#0B0B0B', weight: 5, opacity: 0.9 }).addTo(map);
  if (s.user) {
    var ll = [s.user.lat, s.user.lng];
    if (me) { me.setLatLng(ll); me.bringToFront(); }
    else me = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }).addTo(map);
  } else if (me) { map.removeLayer(me); me = null; }
};
send({ type: 'ready' });
</script></body></html>`;

export default function FlowMap({
  style, center, delta = 0.01, pins = [], userLocation, onPinPress,
  route, fitTo, followUser, onPress, controls = true, insets,
}: FlowMapProps) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const source = useMemo(() => ({ html: html(TILE_URL, MAP_ATTRIBUTION), baseUrl: 'https://flow.app/' }), []);
  const top = insets?.top ?? 0;
  const bottom = insets?.bottom ?? 0;

  const state = JSON.stringify({
    center: followUser && userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : { lat: center.latitude, lng: center.longitude },
    zoom: zoomFor(delta),
    follow: Boolean(followUser),
    fit: fitTo && fitTo.length > 1 ? fitTo.map((p) => [p.latitude, p.longitude]) : null,
    pins: pins.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude, title: p.title, description: p.description, color: p.color ?? colors.ink, car: p.kind === 'car' })),
    route: route ?? null,
    user: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null,
    top,
    bottom,
  });
  const latest = useRef(state);
  const run = (js: string) => web.current?.injectJavaScript(`${js}; true;`);

  useEffect(() => {
    latest.current = state;
    if (ready.current) run(`window.flowUpdate && window.flowUpdate(${state})`);
  }, [state]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        ready.current = true;
        run(`window.flowUpdate(${latest.current})`);
      } else if (msg.type === 'pin') onPinPress?.(String(msg.id));
      else if (msg.type === 'tap') onPress?.({ latitude: msg.lat, longitude: msg.lng });
    } catch {
      // Not ours.
    }
  };

  const here = userLocation ?? center;
  return (
    <View style={style}>
      <WebView
        ref={web}
        style={[StyleSheet.absoluteFill, { backgroundColor: '#E5E7EB' }]}
        source={source}
        originWhitelist={['*']}
        onMessage={onMessage}
        applicationNameForUserAgent="FlowApp/1.0"
        scrollEnabled={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
      />
      {controls && (
        <View style={[styles.controls, { bottom: bottom + 28 }]} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" style={styles.control} onPress={() => run('window.flowZoom(1)')}>
            <Icon name="plus" size={18} color={colors.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" style={styles.control} onPress={() => run('window.flowZoom(-1)')}>
            <Icon name="minus" size={18} color={colors.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Show my position" style={styles.control}
            onPress={() => run(`window.flowGo(${here.latitude}, ${here.longitude})`)}>
            <Icon name="crosshair" size={18} color={colors.ink} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { position: 'absolute', right: space.md, gap: space.sm },
  control: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
});
