import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, driversAPI } from '@/services/api';

// While online and the app is open, the position is sent this often. The
// backend hides drivers whose position is older than 5 minutes, so a closed
// app drops off the riders' map on its own.
const REPORT_EVERY_MS = 30_000;

async function currentPosition() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export function useDriverAvailability(initialOnline: boolean | undefined, canGoOnline: boolean) {
  const { token } = useAuth();
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Follow what the server says (e.g. after a revocation took the driver offline).
  useEffect(() => {
    setOnline(Boolean(initialOnline) && canGoOnline);
  }, [initialOnline, canGoOnline]);

  const report = useCallback(async () => {
    if (!token) return;
    try {
      const position = await currentPosition();
      if (position) await driversAPI.updateLocation(token, position);
    } catch {
      // A missed report is fine; the next one follows shortly.
    }
  }, [token]);

  // Report while online and in the foreground; pause in the background.
  useEffect(() => {
    const stop = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
    const start = () => {
      stop();
      report();
      timer.current = setInterval(report, REPORT_EVERY_MS);
    };
    if (!online) {
      stop();
      return undefined;
    }
    start();
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, [online, report]);

  const toggle = useCallback(async () => {
    if (!token || busy) return;
    if (!online && !canGoOnline) {
      Alert.alert('Not approved yet', 'You can go online once the GreenRide team approves your account.');
      return;
    }
    setBusy(true);
    try {
      if (online) {
        await driversAPI.setAvailability(token, { online: false });
        setOnline(false);
      } else {
        const position = await currentPosition();
        if (!position) {
          Alert.alert('Location needed', 'Allow location access so riders near you can find you.');
          return;
        }
        await driversAPI.setAvailability(token, { online: true, ...position });
        setOnline(true);
      }
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Please check your connection and try again.';
      Alert.alert('Could not change your status', message);
    } finally {
      setBusy(false);
    }
  }, [token, busy, online, canGoOnline]);

  return { online, busy, toggle };
}
