import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverAvailability } from '@/contexts/DriverAvailabilityContext';
import { ApiError, driversAPI, notificationsAPI, ridesAPI } from '@/services/api';
import { retrySharing, startSharing, stopSharing } from '@/services/location-sharing';
import { signalingClient } from '@/services/signalingClient';
import { useT } from '@/i18n';

// Everything the driver's day depends on, kept fresh in one place:
// - the approval status (not_onboarded, pending, verified, rejected + reason)
// - the ride in progress, if any (the app then shows only that ride)
// - incoming requests while online: a new one plays a sound and opens on top
// - the unread notification count for the bell
//
// The backend has no push for new requests, so the list is checked every few
// seconds while online. It has no request timeout either: a request stays
// until a driver takes it or the rider cancels, so the app shows no countdown.

const REQUESTS_EVERY_MS = 5_000;
const RIDE_EVERY_MS = 5_000;
const UNREAD_EVERY_MS = 30_000;

export type Approval = 'loading' | 'not_onboarded' | 'pending' | 'verified' | 'rejected' | 'error';

export type DriverProfile = {
  user_id: number;
  vehicle_make: string | null;
  vehicle_model: string | null;
  license_number: string | null;
  verified: boolean;
  status?: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
};

export type RideRequest = {
  id: number;
  rider?: string;
  pickup: string;
  dropoff: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  // Offered to this driver until then (nearest driver first); null: open to all.
  offer_expires_at?: string | null;
  fare: number;
  distance: number;
  is_shared?: boolean;
  share_mode?: 'friends' | 'others' | null;
  riders_count?: number;
  group_fare?: number;
};

export type ActiveRide = {
  id: number;
  status: 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  pickup: string;
  dropoff: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  fare: number;
  distance: number;
  rider_name: string;
  is_shared: boolean;
  share?: null | { mode?: 'friends' | 'others'; ridersCount?: number; groupFare?: number };
};

type Work = {
  approval: Approval;
  profile: DriverProfile | null;
  reloadProfile: () => Promise<void>;
  activeRide: ActiveRide | null;
  refreshActive: () => Promise<ActiveRide | null>;
  requests: RideRequest[];
  requestById: (id: number) => RideRequest | undefined;
  forgetRequest: (id: number) => void;
  refreshRequests: () => Promise<void>;
  payoutPercent: number;
  unread: number;
  refreshUnread: () => Promise<void>;
};

const WorkContext = createContext<Work | null>(null);

// A group pays per rider; the driver keeps payoutPercent of each fare.
export function driverEarns(req: { fare: number; riders_count?: number }, percent: number) {
  return Math.floor((req.fare * percent) / 100) * Math.max(1, req.riders_count ?? 1);
}

const approvalOf = (driver: DriverProfile): Approval =>
  driver.status === 'rejected' ? 'rejected' : driver.status === 'verified' || driver.verified ? 'verified' : 'pending';

export function DriverWorkProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const { online } = useDriverAvailability();
  const router = useRouter();
  const signedIn = Boolean(token && user?.role === 'driver');

  const [approval, setApproval] = useState<Approval>('loading');
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [payoutPercent, setPayoutPercent] = useState(70);
  const [unread, setUnread] = useState(0);
  const seen = useRef(new Set<number>());
  const forgotten = useRef(new Set<number>());
  const firstLoad = useRef(true);

  const chime = useAudioPlayer(require('@/assets/sounds/new-request.wav'));
  useEffect(() => {
    // Heard even when the phone is on silent: a driver must not miss a ride.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!token) return;
    try {
      const { driver } = await driversAPI.getMe(token);
      setProfile(driver);
      setApproval(approvalOf(driver));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setProfile(null);
        setApproval('not_onboarded');
      } else {
        setApproval((a) => (a === 'loading' ? 'error' : a));
      }
    }
  }, [token]);

  const refreshActive = useCallback(async () => {
    if (!token) return null;
    try {
      const { ride } = await ridesAPI.getActiveRide(token);
      setActiveRide(ride ?? null);
      return ride ?? null;
    } catch {
      return null;
    }
  }, [token]);

  const refreshRequests = useCallback(async () => {
    if (!token) return;
    try {
      const { requests: list } = await ridesAPI.getRideRequests(token);
      const fresh = ((list ?? []) as RideRequest[]).filter((r) => !forgotten.current.has(r.id));
      setRequests(fresh);
      // A request not seen before: sound, vibration, and open it on top.
      const newest = fresh.find((r) => !seen.current.has(r.id));
      fresh.forEach((r) => seen.current.add(r.id));
      if (newest && !firstLoad.current && AppState.currentState === 'active') {
        chime.seekTo(0);
        chime.play();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        router.push(`/request/${newest.id}`);
      }
      firstLoad.current = false;
    } catch {
      // The next check follows in a few seconds.
    }
  }, [token, chime, router]);

  const refreshUnread = useCallback(async () => {
    if (!token) return;
    try {
      const { notifications } = await notificationsAPI.getNotifications(token);
      setUnread((notifications ?? []).filter((n: { read_at: string | null }) => !n.read_at).length);
    } catch {
      // Keep the last count.
    }
  }, [token]);

  // Signed in: load the profile, payout share, ride and unread count.
  useEffect(() => {
    if (!signedIn) return undefined;
    let stop = false;
    Promise.resolve().then(async () => {
      if (stop) return;
      reloadProfile();
      refreshActive();
      refreshUnread();
      driversAPI.getStats(token!).then((s) => !stop && s?.payoutPercent && setPayoutPercent(s.payoutPercent)).catch(() => {});
    });
    const rideTimer = setInterval(refreshActive, RIDE_EVERY_MS);
    const unreadTimer = setInterval(refreshUnread, UNREAD_EVERY_MS);
    return () => {
      stop = true;
      clearInterval(rideTimer);
      clearInterval(unreadTimer);
    };
  }, [signedIn, token, reloadProfile, refreshActive, refreshUnread]);

  // Requests: only while online and not already on a ride.
  const listening = signedIn && online && !activeRide;
  useEffect(() => {
    if (!listening) {
      firstLoad.current = true;
      return undefined;
    }
    Promise.resolve().then(refreshRequests);
    const timer = setInterval(refreshRequests, REQUESTS_EVERY_MS);
    // An offer lasts only seconds: fetch it as soon as the server sends it.
    const offOffer = signalingClient.on('ride:offer', () => refreshRequests());
    return () => {
      clearInterval(timer);
      offOffer();
    };
  }, [listening, refreshRequests]);

  // The position goes out from a foreground service while online or on a
  // ride: every 5 s on a ride, every 15 s while waiting (see location-sharing).
  const { t } = useT();
  const sharing = signedIn && (online || Boolean(activeRide));
  const onRide = Boolean(activeRide);
  useEffect(() => {
    if (!sharing) {
      stopSharing();
      return;
    }
    startSharing(onRide ? 'ride' : 'idle', { title: t('sharing.title'), body: t(onRide ? 'sharing.ride' : 'sharing.idle') });
  }, [sharing, onRide, t]);

  // Back to the app: check everything at once.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !signedIn) return;
      retrySharing();
      reloadProfile();
      refreshActive();
      refreshUnread();
    });
    return () => sub.remove();
  }, [signedIn, reloadProfile, refreshActive, refreshUnread]);

  // Signed out: forget everything.
  useEffect(() => {
    if (signedIn) return;
    Promise.resolve().then(() => {
      setApproval('loading');
      setProfile(null);
      setActiveRide(null);
      setRequests([]);
      setUnread(0);
      seen.current.clear();
      forgotten.current.clear();
    });
  }, [signedIn]);

  const requestById = useCallback((id: number) => requests.find((r) => r.id === id), [requests]);
  const forgetRequest = useCallback((id: number) => {
    forgotten.current.add(id);
    setRequests((list) => list.filter((r) => r.id !== id));
  }, []);

  const value = useMemo<Work>(
    () => ({
      approval, profile, reloadProfile, activeRide, refreshActive, requests, requestById, forgetRequest,
      refreshRequests, payoutPercent, unread, refreshUnread,
    }),
    [approval, profile, reloadProfile, activeRide, refreshActive, requests, requestById, forgetRequest, refreshRequests, payoutPercent, unread, refreshUnread],
  );
  return <WorkContext.Provider value={value}>{children}</WorkContext.Provider>;
}

export function useDriverWork() {
  const value = useContext(WorkContext);
  if (!value) throw new Error('useDriverWork must be used inside DriverWorkProvider');
  return value;
}
