import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SafetyScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Safety Center</Text>
      <Text style={styles.subtitle}>Emergency support, trusted contacts, and incident reporting.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <Text style={styles.item}>Operations Hotline: +234 800 555 0101</Text>
        <Text style={styles.item}>Local Emergency: 112</Text>
        <TouchableOpacity style={styles.emergencyBtn} onPress={() => alert('Triggering SOS protocol and notifying support...')}>
          <Text style={styles.btnText}>Activate SOS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Incident Reporting</Text>
        <Text style={styles.item}>Report unsafe rider behavior, route conflict, or accident case.</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => alert('Incident report submitted for review')}>
          <Text style={styles.secondaryText}>Report Incident</Text>
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
  item: { color: '#334155', marginBottom: 8 },
  emergencyBtn: { backgroundColor: '#b91c1c', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { marginTop: 8, backgroundColor: '#fff7ed', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fdba74' },
  secondaryText: { color: '#9a3412', fontWeight: '700' },
});
