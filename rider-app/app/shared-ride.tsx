import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { ridesAPI } from '../services/api';
import AppLogo from '../components/app-logo';

type Rider = {
  id: number;
  name: string;
  joined_at: string;
};

type Group = {
  id: number;
  status: 'matching' | 'confirmed' | string;
  dropoff: string | null;
  maxRiders: number;
  ridersCount: number;
  createdAt: string;
};

export default function SharedRideScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { token } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !groupId) return;

    setError(null);
    const res = await ridesAPI.getSharedRideGroup(token, groupId);
    setGroup(res.group as Group);
    setRiders((res.riders ?? []) as Rider[]);
  }, [groupId, token]);

  useEffect(() => {
    load().catch((e) => {
      const message = e instanceof Error ? e.message : 'Failed to load shared ride status.';
      setError(message);
    });
  }, [load]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to refresh.';
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.goBack} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.goBackText}>{'< Go Back'}</Text>
      </TouchableOpacity>

      <AppLogo size={52} />
      <Text style={styles.title}>Shared Ride</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Match status</Text>
        <Text style={styles.status}>{group?.status ?? 'matching'}</Text>
        <Text style={styles.meta}>
          Riders: {group?.ridersCount ?? riders.length}/{group?.maxRiders ?? '—'}
        </Text>
        <Text style={styles.meta}>Dropoff: {group?.dropoff ?? '—'}</Text>

        {group?.status === 'confirmed' ? (
          <View style={styles.confirmedPill}>
            <Text style={styles.confirmedText}>Matched! Driver assignment comes next.</Text>
          </View>
        ) : (
          <Text style={styles.hint}>We’ll keep searching for riders heading your way.</Text>
        )}
      </View>

      <Text style={styles.listTitle}>Riders in your pool</Text>
      <FlatList
        data={riders}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.riderRow}>
            <Text style={styles.riderName}>{item.name}</Text>
            <Text style={styles.riderSub}>Joined</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No riders yet.</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/messaging')}>
        <Text style={styles.primaryText}>Open Messaging</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  goBack: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F6F6F6',
  },
  goBackText: {
    color: '#0B0B0B',
    fontWeight: '700',
    fontSize: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0B0B0B',
    marginBottom: 16,
    textAlign: 'center',
  },
  error: {
    color: '#B91C1C',
    marginBottom: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#111827',
    fontWeight: '900',
    marginBottom: 6,
  },
  status: {
    fontSize: 18,
    fontWeight: '900',
    color: '#43a047',
    textTransform: 'capitalize',
  },
  meta: {
    color: '#6B7280',
    marginTop: 6,
  },
  hint: {
    marginTop: 12,
    color: '#111827',
    fontWeight: '600',
  },
  confirmedPill: {
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
  },
  confirmedText: {
    color: '#1B5E20',
    fontWeight: '800',
  },
  listTitle: {
    color: '#111827',
    fontWeight: '900',
    marginBottom: 10,
  },
  riderRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 10,
  },
  riderName: {
    color: '#111827',
    fontWeight: '900',
  },
  riderSub: {
    color: '#6B7280',
    marginTop: 4,
    fontSize: 12,
  },
  empty: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#0B0B0B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
