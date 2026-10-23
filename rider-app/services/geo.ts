import { apiCall } from './api';
import { tr } from '../i18n/translate';

// Address search and road routes. Screens use these two interfaces only; the
// implementation below asks our API, which talks to the OpenStreetMap
// services (Nominatim/Photon, OSRM) configured on the server. Another
// provider means another implementation, not changes in screens.

export type Point = { lat: number; lng: number };

export type Place = Point & {
  id: string;
  name: string;
  address: string;
};

export type RouteStep = {
  type: string;
  modifier: string | null;
  name: string | null;
  distanceM: number;
  durationS: number;
  location: [number, number];
};

export type Route = {
  distanceKm: number;
  durationMin: number;
  // [lat, lng] points to draw.
  geometry: [number, number][];
  steps?: RouteStep[];
};

export interface GeocodingService {
  // Places matching what was typed (call on submit, not on every key).
  search(token: string, text: string, near?: Point | null): Promise<Place[]>;
  // The address at a point (tap on the map). Null when there is none.
  reverse(token: string, point: Point): Promise<Place | null>;
}

export interface RoutingService {
  // Null when no road connects the points.
  route(token: string, from: Point, to: Point, opts?: { steps?: boolean }): Promise<Route | null>;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const geocoding: GeocodingService = {
  async search(token, text, near) {
    const q = new URLSearchParams({ q: text.trim() });
    if (near) {
      q.set('lat', String(near.lat));
      q.set('lng', String(near.lng));
    }
    const { places } = await apiCall(`/geo/search?${q}`, { headers: auth(token) });
    return places ?? [];
  },
  async reverse(token, { lat, lng }) {
    const { place } = await apiCall(`/geo/reverse?lat=${lat}&lng=${lng}`, { headers: auth(token) });
    return place ?? null;
  },
};

export const routing: RoutingService = {
  async route(token, from, to, opts = {}) {
    try {
      const { route } = await apiCall('/geo/route', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ from, to, steps: Boolean(opts.steps) }),
      });
      return route;
    } catch (e: any) {
      if (e?.status === 422) return null;
      throw e;
    }
  },
};

// What to tell the rider when a lookup fails.
export function geoErrorMessage(e: unknown): string {
  const status = (e as { status?: number })?.status;
  if (status === 503) return tr('geo.unavailable');
  if (status === 429) return tr('geo.tooMany');
  if (e instanceof Error && e.name === 'AbortError') return tr('geo.offline');
  return tr('geo.unreachable');
}
