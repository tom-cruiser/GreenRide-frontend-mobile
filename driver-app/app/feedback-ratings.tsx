import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const recentFeedback = [
  { rider: 'Jane O.', score: 5, note: 'Clean car and smooth ride.' },
  { rider: 'Michael K.', score: 4, note: 'Driver was punctual.' },
  { rider: 'Tolu A.', score: 5, note: 'Very professional and helpful.' },
];

export default function FeedbackRatingsScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Feedback & Ratings</Text>
      <Text style={styles.subtitle}>Track passenger feedback and maintain quality score.</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Current Driver Rating</Text>
        <Text style={styles.summaryValue}>4.92 / 5.00</Text>
      </View>

      {recentFeedback.map((item) => (
        <View key={`${item.rider}-${item.note}`} style={styles.feedbackCard}>
          <Text style={styles.rider}>{item.rider}</Text>
          <Text style={styles.score}>Rating: {item.score} / 5</Text>
          <Text style={styles.note}>{item.note}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0B0B0B' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#334155' },
  summaryCard: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#D1D5DB' },
  summaryLabel: { color: '#111111', fontWeight: '700' },
  summaryValue: { marginTop: 4, fontSize: 26, color: '#0B0B0B', fontWeight: '800' },
  feedbackCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  rider: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  score: { marginTop: 4, color: '#334155', fontWeight: '600' },
  note: { marginTop: 4, color: '#475569' },
});
