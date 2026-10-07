import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { promotionsAPI } from '../services/api';

type Promotion = {
  id: number | string;
  title?: string;
  name?: string;
  detail?: string;
  description?: string;
  code?: string;
};

export default function PromotionsScreen() {
  const { token } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Please sign in to view promotions');
      setLoading(false);
      return;
    }
    try {
      const data = await promotionsAPI.getActivePromotions(token);
      setPromotions((data?.promotions as Promotion[]) || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load promotions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    // Deferred a tick so no state is set during the effect itself.
    Promise.resolve().then(load);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Promotions & Incentives</Text>
      <Text style={styles.subtitle}>Track active offers and maximize earnings.</Text>

      {loading && <ActivityIndicator color="#1976d2" />}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && promotions.length === 0 && (
        <Text style={styles.empty}>No active promotions right now.</Text>
      )}

      {promotions.map((promo) => (
        <View key={promo.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {promo.title || promo.name || 'Promotion'}
          </Text>
          <Text style={styles.cardDetail}>
            {promo.detail || promo.description || ''}
          </Text>
          {promo.code && <Text style={styles.code}>Code: {promo.code}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e3f2fd' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0d47a1' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#334155' },
  error: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  empty: { color: '#475569', textAlign: 'center', marginTop: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardDetail: { color: '#334155' },
  code: { color: '#1d4ed8', fontWeight: '700', marginTop: 6 },
});
