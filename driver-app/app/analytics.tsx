import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AnalyticsScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Analytics Dashboard</Text>
      <Text style={styles.subtitle}>Driving habits, conversion rates, and earnings potential insights.</Text>

      <View style={styles.statsGrid}>
        <StatCard label="Acceptance Rate" value="92%" />
        <StatCard label="Completion Rate" value="98%" />
        <StatCard label="Avg Pickup Time" value="4m 20s" />
        <StatCard label="Avg Rider Rating" value="4.92" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Performance Insight</Text>
        <Text style={styles.item}>Peak earnings window: 7:00 AM - 10:00 AM</Text>
        <Text style={styles.item}>Best zone this week: Victoria Island</Text>
        <Text style={styles.item}>Potential weekly uplift with shared rides: +14%</Text>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0B0B0B' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#334155' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statLabel: { color: '#475569', fontSize: 12 },
  statValue: { marginTop: 4, fontSize: 20, fontWeight: '800', color: '#0f172a' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  item: { color: '#334155', marginBottom: 4 },
});
