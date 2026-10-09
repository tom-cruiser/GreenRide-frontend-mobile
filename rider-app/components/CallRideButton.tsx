import React, { useState } from 'react';
import { Alert, type StyleProp, type ViewStyle } from 'react-native';
import { Button } from '@/design';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCall } from '@/hooks/useCall';
import { ridesAPI } from '@/services/api';

// Rides on which the rider and driver may call each other (matches the backend).
export const CALLABLE_RIDE_STATUSES = ['accepted', 'arrived', 'in_progress'];

type Props = {
  rideId: string | number;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

// Calls the other side of a ride. The peer is looked up from the ride itself
// (GET /api/rides/:id), so the button only needs the ride id.
export function CallRideButton({ rideId, label = 'Call', style }: Props) {
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
  return <Button label={label} icon="phone" variant="secondary" size="lg" onPress={onPress} loading={loading} disabled={disabled} style={style} />;
}
