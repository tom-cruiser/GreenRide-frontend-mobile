import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { driversAPI } from '@/services/api';

// While online, the driver's position goes to the server from an Android
// foreground service (with its notification), so it keeps going with the
// screen off or another app open. It needs only "while using the app"
// location permission. Battery: often on a ride (the rider watches the car),
// rarely while waiting for one.

const TASK = 'flow-driver-location';

const MODES = {
  idle: { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 30 },
  ride: { accuracy: Location.Accuracy.High, timeInterval: 5_000, distanceInterval: 10 },
} as const;
export type SharingMode = keyof typeof MODES;

// Runs with the app in the background too: reads the saved login itself.
// (In Expo Go the service may be unavailable; the app then reports from the
// foreground every 30 s, see DriverAvailabilityContext.)
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const { coords } = data.locations[data.locations.length - 1];
  const token = await AsyncStorage.getItem('driverAuthToken').catch(() => null);
  if (!token) return;
  try {
    await driversAPI.updateLocation(token, {
      lat: coords.latitude,
      lng: coords.longitude,
      // -1 / null when the phone doesn't know (standing still).
      ...(coords.heading != null && coords.heading >= 0 ? { heading: coords.heading } : {}),
      ...(coords.speed != null && coords.speed >= 0 ? { speed: coords.speed } : {}),
    });
  } catch {
    // No network for a moment: the next position follows.
  }
});

let current: SharingMode | null = null;
// A switch Android refused (the app was not in front): retried by retrySharing().
let wanted: { mode: SharingMode; notice: { title: string; body: string } } | null = null;

// Starts (or switches) sharing. Must be called with the app open: Android
// only lets a foreground service start from the foreground.
export async function startSharing(mode: SharingMode, notice: { title: string; body: string }) {
  if (current === mode && (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false))) return true;
  try {
    await Location.startLocationUpdatesAsync(TASK, {
      ...MODES[mode],
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: notice.title,
        notificationBody: notice.body,
        notificationColor: '#0B0B0B',
        killServiceOnDestroy: true,
      },
    });
    current = mode;
    wanted = null;
    return true;
  } catch (e) {
    // Android starts a foreground service only from the foreground. Whatever
    // was running keeps running; the switch is retried when the app is back.
    wanted = { mode, notice };
    console.warn('[location] could not start sharing yet, will retry when the app is open:', e);
    return false;
  }
}

// Call when the app comes to the front.
export async function retrySharing() {
  if (wanted) await startSharing(wanted.mode, wanted.notice);
}

export async function stopSharing() {
  current = null;
  wanted = null;
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TASK).catch(() => {});
  }
}

export const sharingMode = () => current;
