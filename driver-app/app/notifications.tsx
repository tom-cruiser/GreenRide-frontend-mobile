import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { notificationsAPI } from '../services/api';

type Notification = {
  id: number | string;
  title?: string;
  message?: string;
  body?: string;
  created_at?: string;
  read?: boolean;
};

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Please sign in to view notifications');
      setLoading(false);
      return;
    }
    try {
      const data = await notificationsAPI.getNotifications(token);
      setItems((data?.notifications as Notification[]) || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
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

  const markRead = async (id: Notification['id']) => {
    if (!token) return;
    try {
      await notificationsAPI.markAsRead(token, id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      // Non-fatal; UI will catch up on next refresh.
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>Ride requests and operational updates.</Text>

      {loading && <ActivityIndicator color="#111111" />}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && items.length === 0 && (
        <Text style={styles.empty}>No notifications yet.</Text>
      )}

      {items.map((n) => (
        <TouchableOpacity
          key={n.id}
          style={[styles.card, n.read && styles.cardRead]}
          onPress={() => !n.read && markRead(n.id)}
        >
          {n.title && <Text style={styles.cardTitle}>{n.title}</Text>}
          <Text style={styles.item}>{n.message || n.body || ''}</Text>
          {n.created_at && <Text style={styles.date}>{n.created_at}</Text>}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0B0B0B' },
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
    borderColor: '#F3F4F6',
  },
  cardRead: { opacity: 0.6 },
  cardTitle: { color: '#0f172a', fontWeight: '700', marginBottom: 4 },
  item: { color: '#0f172a' },
  date: { color: '#64748b', fontSize: 12, marginTop: 4 },
});
