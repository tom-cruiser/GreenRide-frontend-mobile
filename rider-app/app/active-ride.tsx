import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CallRideButton } from '@/components/CallRideButton';
import { useAuth } from '@/contexts/AuthContext';
import { ridesAPI } from '@/services/api';

const POLL_MS = 4000;

type Ride = {
  id: number;
  status: 'gathering' | 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  pickup: string;
  dropoff: string;
  fare: number;
  distance: number;
  driver_name: string | null;
  is_shared: boolean;
  rating: number | null;
  share: null | {
    groupId: number;
    status: string;
    ridersCount: number;
    maxRiders: number;
    mode?: 'friends' | 'others';
    role?: 'host' | 'guest';
  };
};

const CANCELLABLE = ['gathering', 'pending', 'accepted', 'arrived'];

function headline(ride: Ride): { title: string; detail: string } {
  const driver = ride.driver_name ?? 'Your driver';
  switch (ride.status) {
    case 'gathering':
      return { title: 'Waiting for your friends…', detail: 'The driver is requested once your group is ready.' };
    case 'pending':
      return { title: 'Finding a driver…', detail: 'We are offering your ride to nearby drivers.' };
    case 'accepted':
      return { title: `${driver} is on the way`, detail: `Heading to ${ride.pickup}.` };
    case 'arrived':
      return { title: `${driver} has arrived`, detail: `Meet your driver at ${ride.pickup}.` };
    case 'in_progress':
      return { title: 'On your trip', detail: `Heading to ${ride.dropoff}.` };
    case 'completed':
      return { title: 'You have arrived', detail: `${ride.fare.toLocaleString()} FBU was paid from your wallet.` };
    default:
      return { title: 'Ride cancelled', detail: 'The held fare was returned to your wallet.' };
  }
}

export default function ActiveRideScreen() {
  const router = useRouter();
  const { token, updateWalletBalance } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const lastRideId = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const { ride: active } = await ridesAPI.getActiveRide(token);
      if (active) {
        lastRideId.current = active.id;
        setRide(active);
      } else if (lastRideId.current) {
        // The ride just left the open states: show how it ended.
        const { ride: finished } = await ridesAPI.getRide(token, lastRideId.current);
        setRide(finished);
        lastRideId.current = null;
        updateWalletBalance();
      } else {
        setRide((current) => (current && ['completed', 'cancelled'].includes(current.status) ? current : null));
      }
    } catch (e) {
      console.warn('Active ride refresh failed:', e);
    } finally {
      setLoading(false);
    }
  }, [token, updateWalletBalance]);

  // Poll only while this screen is visible and the ride is still open.
  const isOpen = !ride || !['completed', 'cancelled'].includes(ride.status);
  useFocusEffect(
    useCallback(() => {
      refresh();
      if (!isOpen) return undefined;
      const timer = setInterval(refresh, POLL_MS);
      return () => clearInterval(timer);
    }, [refresh, isOpen]),
  );

  const cancel = () => {
    if (!ride || !token) return;
    const hostOfGroup = ride.share?.mode === 'friends' && ride.share.role === 'host';
    Alert.alert('Cancel ride?', hostOfGroup
      ? 'This cancels the ride for your whole group. Everyone gets their money back.'
      : 'The held fare will be returned to your wallet.', [
      { text: 'Keep ride', style: 'cancel' },
      {
        text: 'Cancel ride',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const { ride: cancelled } = await ridesAPI.cancelRide(token, String(ride.id));
            lastRideId.current = null;
            setRide({ ...ride, ...cancelled });
            updateWalletBalance();
          } catch (e) {
            Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Please try again.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const submitRating = async () => {
    if (!ride || !token || rating === 0) return;
    setSubmittingRating(true);
    try {
      await ridesAPI.rateRide(token, String(ride.id), rating, feedback.trim() || undefined);
      Alert.alert('Thank you!', 'Your rating has been sent.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      Alert.alert('Rating failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator size="large" color="#43a047" />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.page, styles.center]}>
        <Text style={styles.title}>No active ride</Text>
        <Text style={styles.detail}>Book a ride and you can follow it here.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/ride-booking')}>
          <Text style={styles.primaryBtnText}>Book a ride</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { title, detail } = headline(ride);
  const hasDriver = ['accepted', 'arrived', 'in_progress'].includes(ride.status);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.goBack} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.goBackText}>{'< Home'}</Text>
      </TouchableOpacity>

      <View style={styles.statusCard}>
        {ride.status === 'pending' && <ActivityIndicator color="#43a047" style={styles.spinner} />}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
        {hasDriver && <CallRideButton rideId={ride.id} label="Call driver" />}
      </View>

      <View style={styles.card}>
        <Row label="From" value={ride.pickup} />
        <Row label="To" value={ride.dropoff} />
        <Row label="Distance" value={`~${Number(ride.distance).toFixed(1)} km`} />
        <Row label="Fare" value={`${ride.fare.toLocaleString()} FBU`} />
        {ride.driver_name && <Row label="Driver" value={ride.driver_name} />}
      </View>

      {ride.share?.mode === 'friends' && ride.status !== 'cancelled' && (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/friends-ride/${ride.share!.groupId}`)}
        >
          <Text style={styles.cardTitle}>Ride with friends</Text>
          <Text style={styles.detail}>
            {ride.share.ridersCount} of {ride.share.maxRiders} riders. Tap to see the group.
          </Text>
        </TouchableOpacity>
      )}

      {ride.is_shared && ride.share && ride.share.mode !== 'friends' && ride.status === 'pending' && (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push({ pathname: '/shared-ride', params: { groupId: String(ride.share!.groupId) } })}
        >
          <Text style={styles.cardTitle}>Shared ride</Text>
          <Text style={styles.detail}>
            {ride.share.ridersCount} of {ride.share.maxRiders} riders matched ({ride.share.status}). Tap for details.
          </Text>
        </TouchableOpacity>
      )}

      {ride.status === 'completed' && ride.rating === null && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How was your ride?</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} accessibilityLabel={`${star} stars`}>
                <IconSymbol name={star <= rating ? 'star.fill' : 'star'} size={34} color={star <= rating ? '#FFD700' : '#ccc'} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Anything to add? (optional)"
            placeholderTextColor="#9CA3AF"
            value={feedback}
            onChangeText={setFeedback}
            multiline
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (rating === 0 || submittingRating) && styles.disabled]}
            onPress={submitRating}
            disabled={rating === 0 || submittingRating}
          >
            <Text style={styles.primaryBtnText}>{submittingRating ? 'Sending…' : 'Send rating'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {CANCELLABLE.includes(ride.status) && (
        <TouchableOpacity style={[styles.cancelBtn, cancelling && styles.disabled]} onPress={cancel} disabled={cancelling}>
          <Text style={styles.cancelText}>{cancelling ? 'Cancelling…' : 'Cancel ride'}</Text>
        </TouchableOpacity>
      )}

      {['completed', 'cancelled'].includes(ride.status) && (
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.secondaryBtnText}>Done</Text>
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
  page: { flex: 1, backgroundColor: '#f5fff7' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  goBack: { alignSelf: 'flex-start', marginBottom: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F6F6F6' },
  goBackText: { color: '#0B0B0B', fontWeight: '700', fontSize: 15 },
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' },
  spinner: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#1b5e20', textAlign: 'center' },
  detail: { color: '#4b5563', textAlign: 'center', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  rowLabel: { color: '#6b7280' },
  rowValue: { color: '#111827', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 8 },
  input: { borderWidth: 1, borderColor: '#d1fae5', borderRadius: 10, padding: 12, minHeight: 60, color: '#0f172a', marginBottom: 8, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#43a047', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: '#fff' },
  secondaryBtnText: { color: '#2e7d32', fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff' },
  cancelText: { color: '#b91c1c', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
