import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

export default function SettingsScreen() {
  const [autoAccept, setAutoAccept] = useState(false);
  const [promoAlerts, setPromoAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings & Preferences</Text>
      <Text style={styles.subtitle}>Notifications, ride acceptance rules, and app behavior controls.</Text>

      <View style={styles.card}>
        <Row label="Auto-accept high-rated riders" value={autoAccept} onChange={setAutoAccept} />
        <Row label="Promotions and incentives notifications" value={promoAlerts} onChange={setPromoAlerts} />
        <Row label="Sound alerts for new ride requests" value={soundAlerts} onChange={setSoundAlerts} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Acceptance Criteria</Text>
        <Text style={styles.item}>Minimum estimated fare: ₦1,200</Text>
        <Text style={styles.item}>Max pickup distance: 6.5 km</Text>
        <Text style={styles.item}>Avoid toll routes: Disabled</Text>
      </View>
    </ScrollView>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e3f2fd' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0d47a1' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#334155' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#dbeafe' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowLabel: { color: '#0f172a', flex: 1, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  item: { color: '#334155', marginBottom: 4 },
});
