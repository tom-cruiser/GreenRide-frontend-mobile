import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

export default function ProfileScreen() {
  const [showRiderRating, setShowRiderRating] = useState(true);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile Management</Text>
      <Text style={styles.subtitle}>Personal profile, vehicle details, and credential status.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <Text style={styles.item}>Name: Alex Driver</Text>
        <Text style={styles.item}>Phone: +234 800 123 4567</Text>
        <Text style={styles.item}>City: Lagos</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vehicle</Text>
        <Text style={styles.item}>Model: Toyota Prius 2018</Text>
        <Text style={styles.item}>Plate: KJA-230HD</Text>
        <Text style={styles.item}>Color: Silver</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Verification Health</Text>
        <Text style={styles.item}>Driver License: Verified</Text>
        <Text style={styles.item}>Vehicle Registration: Verified</Text>
        <Text style={styles.item}>Insurance: Expires in 39 days</Text>
      </View>

      <View style={[styles.card, styles.rowBetween]}>
        <View>
          <Text style={styles.sectionTitle}>Passenger Rating Prompt</Text>
          <Text style={styles.meta}>Ask driver to rate passenger at ride end.</Text>
        </View>
        <Switch value={showRiderRating} onValueChange={setShowRiderRating} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e3f2fd' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0d47a1' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#334155' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  item: { color: '#334155', marginBottom: 4 },
  meta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
