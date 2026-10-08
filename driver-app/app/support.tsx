import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supportAPI } from '../services/api';

type Ticket = {
  id: number | string;
  category?: string;
  subject?: string;
  message?: string;
  status?: string;
  created_at?: string;
};

const FAQS = [
  'How do I update expired documents?',
  'Why was a payout delayed?',
  'How to dispute a rider rating?',
  'How to report app issues quickly?',
];

export default function SupportScreen() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!token) {
      setLoadingTickets(false);
      return;
    }
    try {
      const data = await supportAPI.getTickets(token);
      setTickets((data?.tickets as Ticket[]) || []);
    } catch {
      // Non-fatal; user can still file a new ticket.
    } finally {
      setLoadingTickets(false);
    }
  }, [token]);

  useEffect(() => {
    // Deferred a tick so no state is set during the effect itself.
    Promise.resolve().then(loadTickets);
  }, [loadTickets]);

  const submit = async () => {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to contact support.');
      return;
    }
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing info', 'Subject and message are both required.');
      return;
    }
    setSubmitting(true);
    try {
      await supportAPI.submitTicket(token, {
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubject('');
      setMessage('');
      Alert.alert('Submitted', 'Your support ticket was created.');
      loadTickets();
    } catch (e) {
      Alert.alert(
        'Submission failed',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Support & Help Center</Text>
      <Text style={styles.subtitle}>FAQs and direct support for driver operations.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQS.map((item) => (
          <Text key={item} style={styles.item}>• {item}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Submit a Ticket</Text>
        <TextInput
          style={styles.input}
          placeholder="Category (e.g. payout, account)"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Describe the issue"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.btnDisabled]}
          disabled={submitting}
          onPress={submit}
        >
          <Text style={styles.primaryText}>
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your Tickets</Text>
        {loadingTickets && <ActivityIndicator color="#111111" />}
        {!loadingTickets && tickets.length === 0 && (
          <Text style={styles.item}>No tickets yet.</Text>
        )}
        {tickets.map((t) => (
          <View key={t.id} style={styles.ticketRow}>
            <Text style={styles.ticketSubject}>{t.subject || 'Ticket'}</Text>
            {t.status && (
              <Text style={styles.ticketStatus}>Status: {t.status}</Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0B0B0B' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#334155' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  item: { color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  primaryBtn: {
    backgroundColor: '#111111',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  ticketRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ticketSubject: { color: '#0f172a', fontWeight: '600' },
  ticketStatus: { color: '#64748b', fontSize: 12, marginTop: 2 },
});
