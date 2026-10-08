import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SharedRidesScreen() {
  const [enabled, setEnabled] = useState(true);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Shared Ride Options</Text>
      <Text style={styles.subtitle}>Manage co-passenger requests and route coordination.</Text>

      <View style={[styles.card, styles.rowBetween]}>
        <View>
          <Text style={styles.sectionTitle}>Accept Shared Rides</Text>
          <Text style={styles.meta}>Enable to receive pooled trip requests.</Text>
        </View>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current Shared Route</Text>
        <Text style={styles.item}>Pickup 1: Admiralty Way</Text>
        <Text style={styles.item}>Pickup 2: Jakande Roundabout</Text>
        <Text style={styles.item}>Dropoff sequence optimized for shortest ETA.</Text>
        <TouchableOpacity style={styles.routeBtn} onPress={() => alert('Route optimization complete')}>
          <Text style={styles.routeText}>Optimize Route</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0B0B0B' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#334155' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  meta: { color: '#64748b', fontSize: 12 },
  item: { color: '#334155', marginBottom: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeBtn: { marginTop: 8, backgroundColor: '#111111', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  routeText: { color: '#fff', fontWeight: '700' },
});
