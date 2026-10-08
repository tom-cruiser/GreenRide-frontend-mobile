import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CallRideButton } from '@/components/CallRideButton';
import { useAuth } from '@/contexts/AuthContext';
import { ridesAPI } from '@/services/api';

const POLL_MS = 5000;

type Ride = {
  id: number;
  status: 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'pending';
  pickup: string;
  dropoff: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  fare: number;
  distance: number;
  rider_name: string;
  is_shared: boolean;
  // A "share with friends" group: one pickup and drop-off for everyone.
  share?: null | { mode?: 'friends' | 'others'; ridersCount?: number; groupFare?: number };
};

// The next step for each status, and what the driver should be doing.
const NEXT_STEP: Record<string, { action: 'arrive' | 'start' | 'complete'; label: string; hint: string }> = {
  accepted: { action: 'arrive', label: "I've arrived", hint: 'Drive to the pickup point.' },
  arrived: { action: 'start', label: 'Start trip', hint: 'Wait for the rider to get in, then start the trip.' },
  in_progress: { action: 'complete', label: 'Complete trip', hint: 'Drive to the destination.' },
};

function openDirections(ride: Ride) {
  const toPickup = ride.status !== 'in_progress';
  const destination =
    toPickup && ride.pickup_lat != null && ride.pickup_lng != null
      ? `${ride.pickup_lat},${ride.pickup_lng}`
      : toPickup
        ? ride.pickup
        : ride.dropoff;
  Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
  ).catch(() => Alert.alert('Maps unavailable', 'Could not open directions on this phone.'));
}

export default function ActiveRideScreen() {
  const router = useRouter();
  const { token, updateWalletBalance } = useAuth();
  const [ride, setRideState] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActingState] = useState(false);
  // Refs mirror the state so the polling callback reads current values.
  const rideRef = useRef<Ride | null>(null);
  const actingRef = useRef(false);

  const setRide = (next: Ride | null) => {
    rideRef.current = next;
    setRideState(next);
  };
  const setActing = (value: boolean) => {
    actingRef.current = value;
    setActingState(value);
  };

  const refresh = useCallback(async () => {
    if (!token || actingRef.current) return;
    try {
      const { ride: active } = await ridesAPI.getActiveRide(token);
      // The ride vanished without the driver acting: the rider cancelled it.
      if (rideRef.current && !active && !actingRef.current) {
        Alert.alert('Ride cancelled', 'The rider cancelled this ride.');
      }
      rideRef.current = active;
      setRideState(active);
    } catch (e) {
      console.warn('Active ride refresh failed:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, POLL_MS);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  const advance = async () => {
    if (!ride || !token) return;
    const step = NEXT_STEP[ride.status];
    if (!step) return;
    setActing(true);
    try {
      if (step.action === 'complete') {
        const result = await ridesAPI.completeRide(token, ride.id);
        setRide(null);
        updateWalletBalance();
        Alert.alert('Trip complete', `You earned ${result.driverAmount.toLocaleString()} FBU.`, [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        const result =
          step.action === 'arrive'
            ? await ridesAPI.arriveRide(token, ride.id)
            : await ridesAPI.startRide(token, ride.id);
        if (rideRef.current) setRide({ ...rideRef.current, status: result.status });
      }
    } catch (e) {
      Alert.alert('Could not update the ride', e instanceof Error ? e.message : 'Please try again.');
      refresh();
    } finally {
      setActing(false);
    }
  };

  const release = () => {
    if (!ride || !token) return;
    Alert.alert('Give up this ride?', 'It goes back to other drivers; the rider keeps their booking.', [
      { text: 'Keep ride', style: 'cancel' },
      {
        text: 'Give up ride',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          try {
            await ridesAPI.cancelRide(token, ride.id);
            setRide(null);
            router.replace('/ride-requests');
          } catch (e) {
            Alert.alert('Could not release the ride', e instanceof Error ? e.message : 'Please try again.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.page, styles.center]}>
        <Text style={styles.title}>No active ride</Text>
        <Text style={styles.hint}>Accept a ride request to start a trip.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/ride-requests')}>
          <Text style={styles.primaryBtnText}>See ride requests</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const step = NEXT_STEP[ride.status];
  const group = ride.share?.mode === 'friends' && (ride.share.ridersCount ?? 1) > 1
    ? { riders: ride.share.ridersCount ?? 1, fare: ride.share.groupFare ?? ride.fare }
    : null;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>{ride.status === 'in_progress' ? 'On trip' : ride.status === 'arrived' ? 'At pickup' : 'Going to pickup'}</Text>
        <Text style={styles.title}>
          {ride.rider_name}
          {group ? ` + ${group.riders - 1} friend${group.riders > 2 ? 's' : ''}` : ''}
        </Text>
        {group && <Text style={styles.hint}>Pick up all {group.riders} riders at the same place.</Text>}
        {step && <Text style={styles.hint}>{step.hint}</Text>}
        <CallRideButton rideId={ride.id} label="Call rider" />
      </View>

      <View style={styles.card}>
        <Row label="Pickup" value={ride.pickup} />
        <Row label="Destination" value={ride.dropoff} />
        <Row label="Distance" value={`~${Number(ride.distance).toFixed(1)} km`} />
        {group ? (
          <>
            <Row label="Riders" value={String(group.riders)} />
            <Row label="Group fare" value={`${group.fare.toLocaleString()} FBU`} />
          </>
        ) : (
          <Row label="Fare" value={`${ride.fare.toLocaleString()} FBU`} />
        )}
        {ride.is_shared && <Row label="Type" value={group ? 'Group ride (friends)' : 'Shared ride'} />}
      </View>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => openDirections(ride)}>
        <Text style={styles.secondaryBtnText}>
          {ride.status === 'in_progress' ? 'Directions to destination' : 'Directions to pickup'}
        </Text>
      </TouchableOpacity>

      {step && (
        <TouchableOpacity style={[styles.primaryBtn, acting && styles.disabled]} onPress={advance} disabled={acting}>
          {acting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{step.label}</Text>}
        </TouchableOpacity>
      )}

      {ride.status !== 'in_progress' && (
        <TouchableOpacity style={[styles.cancelBtn, acting && styles.disabled]} onPress={release} disabled={acting}>
          <Text style={styles.cancelText}>Give up ride</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { padding: 20, paddingBottom: 40 },
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  statusLabel: { color: '#111111', fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#0B0B0B', textAlign: 'center', marginTop: 4 },
  hint: { color: '#334155', textAlign: 'center', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  rowLabel: { color: '#64748b' },
  rowValue: { color: '#0f172a', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  primaryBtn: { backgroundColor: '#111111', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  secondaryBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  secondaryBtnText: { color: '#111111', fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff', marginTop: 12 },
  cancelText: { color: '#b91c1c', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
