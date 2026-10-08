import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/design';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCall } from '@/hooks/useCall';
import { ridesAPI } from '@/services/api';

// Rides on which the rider and driver may call each other (matches the backend).
export const CALLABLE_RIDE_STATUSES = ['accepted', 'arrived', 'in_progress'];

type Props = {
  rideId: string | number;
  label?: string;
};

// Calls the other side of a ride. The peer is looked up from the ride itself
// (GET /api/rides/:id), so the button only needs the ride id.
export function CallRideButton({ rideId, label = 'Call' }: Props) {
  const { user, token } = useAuth();
  const { phase, initiateCall } = useCall();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onPress = async () => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const { ride } = await ridesAPI.getRide(token, rideId);
      if (!CALLABLE_RIDE_STATUSES.includes(ride.status) || !ride.driver_id) {
        Alert.alert('Call unavailable', 'Calls are only available while the ride is in progress.');
        return;
      }
      const iAmRider = String(ride.rider_id) === String(user.id);
      const peerId = iAmRider ? ride.driver_id : ride.rider_id;
      const peerName = (iAmRider ? ride.driver_name : ride.rider_name) || (iAmRider ? 'Your driver' : 'Your rider');
      if (await initiateCall(String(peerId), peerName)) router.push('/call');
    } catch (e) {
      Alert.alert('Call failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || (phase !== 'idle' && phase !== 'ended');

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.text}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    marginTop: 8,
  },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontWeight: '700' },
});
