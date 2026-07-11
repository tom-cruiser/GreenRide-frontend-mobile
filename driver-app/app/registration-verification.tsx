import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RegistrationVerificationScreen() {
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  const docs = ['Driver License', 'Vehicle Registration', 'Vehicle Insurance', 'Profile Photo'];

  const toggleDoc = (doc: string) => {
    setUploadedDocs((prev) =>
      prev.includes(doc) ? prev.filter((item) => item !== doc) : [...prev, doc]
    );
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registration & Verification</Text>
      <Text style={styles.subtitle}>Complete onboarding by uploading all required credentials.</Text>

      {docs.map((doc) => {
        const isUploaded = uploadedDocs.includes(doc);
        return (
          <TouchableOpacity key={doc} style={styles.docCard} onPress={() => toggleDoc(doc)}>
            <View>
              <Text style={styles.docTitle}>{doc}</Text>
              <Text style={styles.docHint}>Tap to simulate upload or replace document.</Text>
            </View>
            <Text style={[styles.status, isUploaded ? styles.done : styles.pending]}>
              {isUploaded ? 'Uploaded' : 'Pending'}
            </Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Verification Status</Text>
        <Text style={styles.summaryValue}>
          {uploadedDocs.length === docs.length ? 'Submitted for review' : 'Action required'}
        </Text>
        <Text style={styles.summaryNote}>
          Uploaded {uploadedDocs.length}/{docs.length} required documents.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e3f2fd' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0d47a1' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#334155' },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  docHint: { marginTop: 2, fontSize: 12, color: '#64748b' },
  status: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  done: { color: '#166534', backgroundColor: '#dcfce7' },
  pending: { color: '#b45309', backgroundColor: '#fef3c7' },
  summaryCard: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  summaryTitle: { color: '#1e3a8a', fontWeight: '700', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  summaryNote: { marginTop: 4, color: '#475569' },
});
