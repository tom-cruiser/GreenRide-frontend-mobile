import type { StyleSpecification } from '@maplibre/maplibre-react-native';

// Map look (Android, MapLibre). Set per build profile in eas.json or .env:
//   EXPO_PUBLIC_MAP_STYLE_URL  a MapLibre style (MapTiler, Stadia, self-hosted)
//   EXPO_PUBLIC_MAP_TILE_URL   or raster tiles ({z}/{x}/{y}) wrapped in a basic style
// With neither, development builds use the public OpenStreetMap tiles, which
// are for light testing only (tile usage policy); release builds must set one.
// Routing and address search go through our API (see services/geo.ts).

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_ATTRIBUTION = '© OpenStreetMap contributors';

function rasterStyle(tiles: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: { type: 'raster', tiles: [tiles], tileSize: 256, maxzoom: 19 },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  };
}

// null: no map source configured for this build (the map says so).
export function mapStyle(): string | StyleSpecification | null {
  const styleUrl = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
  if (styleUrl) return styleUrl;
  const tiles = process.env.EXPO_PUBLIC_MAP_TILE_URL || (__DEV__ ? OSM_TILES : '');
  return tiles ? rasterStyle(tiles) : null;
}
