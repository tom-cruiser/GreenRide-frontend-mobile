import React, { useEffect, useMemo, useRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '@/design';
import type { FlowMapProps } from './flow-map.types';

export type { FlowMapProps, LatLng, MapPin } from './flow-map.types';

// Android: OpenStreetMap tiles drawn by Leaflet in a WebView, so no Google
// Maps key is needed. Pins and the centre are pushed in without reloading the
// page, so moving positions update live.
const TILE_URL = process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const zoomFor = (delta: number) => Math.max(3, Math.min(18, Math.round(Math.log2(360 / delta))));

const html = (tiles: string, me: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;background:#E5E7EB}.leaflet-control-attribution{font-size:9px}</style>
</head><body><div id="map"></div><script>
var map = L.map('map', { zoomControl: false, attributionControl: true });
map.attributionControl.setPrefix(false);
L.tileLayer(${JSON.stringify(tiles)}, { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
var layer = L.layerGroup().addTo(map), meDot = null, lastCenter = '';
function send(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
window.flowUpdate = function (s) {
  var c = s.center.latitude + ',' + s.center.longitude + ',' + s.zoom;
  if (c !== lastCenter) { lastCenter = c; map.setView([s.center.latitude, s.center.longitude], s.zoom, { animate: !!map._loaded }); }
  layer.clearLayers();
  s.pins.forEach(function (p) {
    var m = L.circleMarker([p.latitude, p.longitude], { radius: 9, color: '#fff', weight: 3, fillColor: p.color, fillOpacity: 1 }).addTo(layer);
    if (p.title || p.description) {
      var box = document.createElement('div'), t = document.createElement('b'), d = document.createElement('div');
      t.textContent = p.title || ''; d.textContent = p.description || ''; box.appendChild(t); box.appendChild(d);
      m.bindPopup(box);
    }
    m.on('click', function () { send({ type: 'pin', id: p.id }); });
  });
  if (s.user) {
    var ll = [s.user.latitude, s.user.longitude];
    if (meDot) meDot.setLatLng(ll);
    else meDot = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: ${JSON.stringify(me)}, fillOpacity: 1 }).addTo(map);
  } else if (meDot) { map.removeLayer(meDot); meDot = null; }
};
send({ type: 'ready' });
</script></body></html>`;

export default function FlowMap({ style, center, delta = 0.01, pins = [], userLocation, onPinPress }: FlowMapProps) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const source = useMemo(() => ({ html: html(TILE_URL, '#2563EB'), baseUrl: 'https://flow.app/' }), []);

  const state = JSON.stringify({
    center,
    zoom: zoomFor(delta),
    pins: pins.map((p) => ({ ...p, color: p.color ?? colors.ink })),
    user: userLocation ?? null,
  });
  const latest = useRef(state);
  const push = (s: string) => web.current?.injectJavaScript(`window.flowUpdate && window.flowUpdate(${s}); true;`);

  useEffect(() => {
    latest.current = state;
    if (ready.current) push(state);
  }, [state]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        ready.current = true;
        push(latest.current);
      } else if (msg.type === 'pin') onPinPress?.(String(msg.id));
    } catch {
      // Not ours.
    }
  };

  return (
    <WebView
      ref={web}
      style={[{ backgroundColor: '#E5E7EB' }, style]}
      source={source}
      originWhitelist={['*']}
      onMessage={onMessage}
      applicationNameForUserAgent="FlowApp/1.0"
      scrollEnabled={false}
      overScrollMode="never"
      setBuiltInZoomControls={false}
    />
  );
}
