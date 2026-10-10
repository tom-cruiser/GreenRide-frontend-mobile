import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, driversAPI } from '@/services/api';
import { useT } from '@/i18n';
import { sharingMode } from '@/services/location-sharing';

// The position normally goes out from the foreground service
// (services/location-sharing); in Expo Go, or if that could not start, it is
// sent this often while the app is open, so riders still see the car move.
// The backend hides drivers whose position is older than 5 minutes, so a
// closed app drops off the riders' map on its own.
const REPORT_EVERY_MS = 10_000;
// The driver's last choice. Approved drivers are online by default when they
// open the app, unless they chose "Go Offline".
const PREFERENCE_KEY = 'driverWantsOnline';

type Availability = {
  online: boolean;
  busy: boolean;
  approved: boolean;
  locationDenied: boolean;
  toggle: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AvailabilityContext = createContext<Availability | null>(null);

// A fresh fix can take long or never come (indoors, weak GPS): wait this long at most.
const FIX_TIMEOUT_MS = 10_000;
// A last known position this recent is good enough to go online with.
const LAST_KNOWN_MAX_AGE_MS = 2 * 60_000;

// 'denied': no permission. null: allowed, but no position yet.
async function currentPosition(ask: boolean): Promise<{ lat: number; lng: number } | 'denied' | null> {
  const permission = ask
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') return 'denied';
  const toPoint = (pos: Location.LocationObject | null) => (pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null);
  const recent = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS }).catch(() => null);
  if (recent) return toPoint(recent);
  const fresh = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS)),
  ]);
  return toPoint(fresh);
}

export function DriverAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const { t } = useT();
  const [online, setOnline] = useState(false);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const goOnline = useCallback(async (ask: boolean) => {
    if (!token) return false;
    const position = await currentPosition(ask).catch(() => null);
    if (position === 'denied') {
      setLocationDenied(true);
      return false;
    }
    setLocationDenied(false);
    // No fix yet: online anyway; the position follows as soon as there is one.
    await driversAPI.setAvailability(token, { online: true, ...(position ?? {}) });
    setOnline(true);
    return true;
  }, [token]);

  // On sign-in and whenever the app comes back: approved drivers who didn't
  // choose to be offline go online.
  const refresh = useCallback(async () => {
    if (!token || user?.role !== 'driver') return;
    try {
      const { driver } = await driversAPI.getMe(token);
      const isApproved = driver?.status ? driver.status === 'verified' : Boolean(driver?.verified);
      setApproved(isApproved);
      if (!isApproved) {
        setOnline(false);
        return;
      }
      const wantsOnline = (await AsyncStorage.getItem(PREFERENCE_KEY).catch(() => null)) !== 'false';
      if (wantsOnline) await goOnline(true);
      else setOnline(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setApproved(false);
      setOnline(false);
    }
  }, [token, user?.role, goOnline]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    // Runs as a callback (like the AppState listener below), not during the effect.
    Promise.resolve().then(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  // Report the position while online and in the foreground.
  useEffect(() => {
    const stop = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
    const report = async () => {
      if (!token || sharingMode()) return;
      try {
        const position = await currentPosition(false);
        if (position && position !== 'denied') await driversAPI.updateLocation(token, position);
      } catch {
        // A missed report is fine; the next one follows shortly.
      }
    };
    if (!online || !token) {
      stop();
      return undefined;
    }
    timer.current = setInterval(report, REPORT_EVERY_MS);
    return stop;
  }, [online, token]);

  // Back from the background: check approval again and resume.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const toggle = useCallback(async () => {
    if (!token || busy) return;
    // Not approved: Home shows the approval card instead of the button.
    if (!online && !approved) return;
    setBusy(true);
    try {
      if (online) {
        await AsyncStorage.setItem(PREFERENCE_KEY, 'false').catch(() => {});
        await driversAPI.setAvailability(token, { online: false });
        setOnline(false);
      } else {
        await AsyncStorage.setItem(PREFERENCE_KEY, 'true').catch(() => {});
        const ok = await goOnline(true);
        if (!ok) {
          Alert.alert(t('home.locationTitle'), t('home.locationText'));
        }
      }
    } catch (e) {
      const message = e instanceof ApiError ? e.message : t('common.network');
      Alert.alert(t('home.statusError'), message);
    } finally {
      setBusy(false);
    }
  }, [token, busy, online, approved, goOnline, t]);

  return (
    // Signed out: never online, whatever the last state was.
    <AvailabilityContext.Provider
      value={{ online: Boolean(token) && online, busy, approved: Boolean(token) && approved, locationDenied, toggle, refresh }}
    >
      {children}
    </AvailabilityContext.Provider>
  );
}

export function useDriverAvailability() {
  const value = useContext(AvailabilityContext);
  if (!value) throw new Error('useDriverAvailability must be used inside DriverAvailabilityProvider');
  return value;
}
