import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function MessagingScreen() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    'Rider: I am at the gate by the blue store.',
    'Driver: Great, I am 2 minutes away.',
  ]);

  const send = () => {
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, `Driver: ${draft.trim()}`]);
    setDraft('');
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>In-App Messaging</Text>
      <Text style={styles.subtitle}>Secure chat and call actions without exposing personal numbers.</Text>

      <View style={styles.callActions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => alert('Calling rider through masked number...')}>
          <Text style={styles.btnText}>Call Rider</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => alert('Opening ride support line...')}>
          <Text style={styles.secondaryText}>Call Support</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chatCard}>
        {messages.map((item, index) => (
          <Text key={`${item}-${index}`} style={styles.message}>
            {item}
          </Text>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message to rider"
          style={styles.input}
        />
        <TouchableOpacity onPress={send} style={styles.sendBtn}>
          <Text style={styles.btnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0B0B0B' },
  subtitle: { marginTop: 6, marginBottom: 12, color: '#334155' },
  callActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#111111',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  secondaryText: { color: '#111111', fontWeight: '700' },
  chatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: 180,
  },
  message: { marginBottom: 8, color: '#0f172a' },
  inputRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  sendBtn: {
    backgroundColor: '#111111',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});
