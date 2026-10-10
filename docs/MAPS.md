# Maps in the apps

- **Android**: MapLibre with OpenStreetMap data (`components/flow-map.android.tsx`).
  No Google Maps key is needed.
- **iOS**: Apple Maps through `react-native-maps` (`components/flow-map.ios.tsx`), unchanged.
- Address search, routes and fares come from the Flow API (`services/geo.ts`),
  which talks to OSRM and Nominatim/Photon. Server settings and self-hosting are
  in the backend repository: `docs/MAPS_SETUP.md`.

What uses it:

| App | Screen | What it shows |
|---|---|---|
| Rider | Home, Book a ride | live blue dot, nearby drivers, zoom and recenter buttons |
| Rider | Book a ride → Pickup / Drop-off | search (on submit), "My location", tap on the map (address looked up) |
| Rider | Book a ride → See the price | road route drawn, road distance, trip time and the server's fare |
| Rider | Active ride | the driver's car moving live, minutes away, the route |
| Driver | Home | position, pickup points of offered rides |
| Driver | Request | countdown: the ride is offered to the nearest driver for 20 s |
| Driver | Ride → Navigate | turn-by-turn to the pickup then the drop-off; reroutes when off the route |
| Driver | (background) | position sent from a foreground service with a notification, every 5 s on a ride, 15 s otherwise |

## Configuration

Set per EAS build profile (`eas.json`) or in `.env` for local builds:

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | the Flow API (default: the computer running Metro, port 4000) |
| `EXPO_PUBLIC_MAP_STYLE_URL` | a MapLibre style URL (MapTiler, Stadia, self-hosted); production |
| `EXPO_PUBLIC_MAP_TILE_URL` | raster tiles `{z}/{x}/{y}`; development and preview use the public OSM tiles |

The `production` profile does not set a map source. It must come from an EAS
environment variable, because it carries a provider key (see the backend's
`docs/MAPS_SETUP.md`).

## Testing on Android

Quick check with **Expo Go** still works: `npx expo start --go`, then scan
the QR code. Expo Go has no MapLibre, so there the Android map is Leaflet in a
WebView (`components/flow-map.webview.tsx`) with the same OpenStreetMap data,
and the driver's position is only sent while the app is open.

For the real thing (MapLibre, background location) use a development build.
You install it once, then JavaScript changes still load live from Metro.

On a phone (cloud build, no Android SDK needed):

```bash
cd rider-app
npx eas build --profile development --platform android
```

Install the APK from the link EAS prints, then run `npx expo start` and open
the project from the development build. Do the same in `driver-app`.

On this computer with an emulator (`greenride-rider` / `greenride-driver` AVDs):

```bash
cd rider-app
JAVA_HOME=~/.local/jdk-17 ANDROID_HOME=~/Android/Sdk npx expo run:android
```

Checks worth doing on a real phone:

1. Rider Home: the map loads and the blue dot is where you are. "© OpenStreetMap contributors" shows bottom left.
2. Book a ride: Pickup starts at your address. Search a place and press Search, or pick on the map and see the address. See the price: the route is drawn and the distance is by road.
3. Driver online, rider books: the request appears with a countdown. Let it run out: it goes away (the ride moves to the next driver).
4. Accept: the rider sees the car move. On the driver, Navigate gives turn instructions; drive off the route and a new one appears.
5. Driver app in the background or screen off: the "Flow: you are online" notification stays, and the rider's map still moves.

## Unit tests

```bash
cd rider-app && npm test    # geo service with mocked HTTP
cd driver-app && npm test   # navigation: progress, instructions, off-route
```
