import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { ridesAPI } from '../services/api';
import { CallRideButton, CALLABLE_RIDE_STATUSES } from '../components/CallRideButton';

type Ride = {
  id: number | string;
  date?: string;
  created_at?: string;
  pickup?: string;
  dropoff?: string;
  fare?: number | string;
  distance?: number | string;
  rider_rating?: number;
  rating?: number;
  status?: string;
};

const formatFare = (fare: Ride['fare']) => {
  if (typeof fare === 'number') return `${fare.toLocaleString()} FBU`;
  if (typeof fare === 'string' && fare.length > 0) return fare;
  return '—';
};

export default function RideHistoryScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Please sign in to view ride history');
      setLoading(false);
      return;
    }
    try {
      const data = await ridesAPI.getRideHistory(token);
      setRides((data?.rides as Ride[]) || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ride history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ride History</Text>
      {loading && <ActivityIndicator size="large" color="#1976d2" />}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={rides}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No completed rides yet.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const rating = item.rider_rating ?? item.rating;
          return (
            <View style={styles.card}>
              <Text style={styles.date}>{item.date || item.created_at || ''}</Text>
              {item.pickup && (
                <Text style={styles.detail}>Pickup: {item.pickup}</Text>
              )}
              {item.dropoff && (
                <Text style={styles.detail}>Dropoff: {item.dropoff}</Text>
              )}
              {item.distance !== undefined && (
                <Text style={styles.detail}>Distance: {item.distance} km</Text>
              )}
              <Text style={styles.fare}>{formatFare(item.fare)}</Text>
              {rating !== undefined && (
                <Text style={styles.detail}>Passenger Rating: {rating}/5</Text>
              )}
              {item.status && <Text style={styles.status}>{item.status}</Text>}
              {item.status && CALLABLE_RIDE_STATUSES.includes(item.status) && (
                <CallRideButton rideId={item.id} label="Call rider" />
              )}
              <TouchableOpacity
                style={styles.feedbackBtn}
                onPress={() => router.push('/feedback-ratings')}
              >
                <Text style={styles.feedbackText}>View Feedback</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e3f2fd', padding: 24 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 24,
    textAlign: 'center',
  },
  error: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  empty: { color: '#475569', textAlign: 'center', marginTop: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  date: {
    fontSize: 15,
    color: '#1976d2',
    fontWeight: '600',
    marginBottom: 4,
  },
  detail: { fontSize: 15, color: '#555', marginBottom: 2 },
  fare: {
    fontSize: 16,
    color: '#43a047',
    fontWeight: 'bold',
    marginVertical: 4,
  },
  status: { fontSize: 14, color: '#43a047', fontWeight: '600' },
  feedbackBtn: {
    marginTop: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  feedbackText: { color: '#1d4ed8', fontWeight: '700', fontSize: 13 },
});
