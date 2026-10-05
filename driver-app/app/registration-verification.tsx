import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverProfile } from '@/hooks/useDriverProfile';
import { driversAPI, type VehicleDetails } from '@/services/api';

const EMPTY_FORM: VehicleDetails = { vehicle_make: '', vehicle_model: '', license_number: '' };

const FIELDS: { key: keyof VehicleDetails; label: string; placeholder: string }[] = [
  { key: 'vehicle_make', label: 'Vehicle make', placeholder: 'Toyota' },
  { key: 'vehicle_model', label: 'Vehicle model', placeholder: 'Corolla' },
  { key: 'license_number', label: 'Driving licence number', placeholder: 'As printed on your licence' },
];

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '');

export default function RegistrationVerificationScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { profile, setProfile, status, setStatus, error, reload } = useDriverProfile();
  const [form, setForm] = useState<VehicleDetails>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        vehicle_make: profile.vehicle_make ?? '',
        vehicle_model: profile.vehicle_model ?? '',
        license_number: profile.license_number ?? '',
      });
    }
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const submit = async () => {
    if (!token) return;
    const details = {
      vehicle_make: form.vehicle_make.trim(),
      vehicle_model: form.vehicle_model.trim(),
      license_number: form.license_number.trim(),
    };
    if (!details.vehicle_make || !details.vehicle_model || !details.license_number) {
      Alert.alert('Missing details', 'Please fill in every field.');
      return;
    }
    setSubmitting(true);
    try {
      const { driver } =
        status === 'not_onboarded'
          ? await driversAPI.onboard(token, details)
          : await driversAPI.updateMe(token, details);
      setProfile(driver);
      setStatus(driver.verified ? 'verified' : 'pending');
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = status === 'not_onboarded' || (status === 'pending' && editing);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Registration & Verification</Text>
      <Text style={styles.subtitle}>
        Add your vehicle, then the GreenRide team approves your account before you can accept rides.
      </Text>

      <View style={styles.steps}>
        <Step number={1} label="Vehicle details" done={status === 'pending' || status === 'verified'} />
        <Step number={2} label="Approval" done={status === 'verified'} />
      </View>

      {status === 'loading' && <ActivityIndicator size="large" color="#1976d2" style={styles.loader} />}

      {status === 'error' && (
        <View style={styles.card}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={reload}>
            <Text style={styles.secondaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {showForm && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editing ? 'Edit vehicle details' : 'Your vehicle'}</Text>
          {FIELDS.map((field) => (
            <View key={field.key} style={styles.field}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                value={form[field.key]}
                onChangeText={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                placeholder={field.placeholder}
                placeholderTextColor="#9CA3AF"
                autoCapitalize={field.key === 'license_number' ? 'characters' : 'words'}
                style={styles.input}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{editing ? 'Save changes' : 'Submit for approval'}</Text>
            )}
          </TouchableOpacity>
          {editing && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditing(false)}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {profile && !showForm && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Your vehicle</Text>
            <Text style={[styles.badge, profile.verified ? styles.badgeDone : styles.badgePending]}>
              {profile.verified ? 'Approved' : 'Waiting for approval'}
            </Text>
          </View>
          <Text style={styles.item}>
            {profile.vehicle_make} {profile.vehicle_model}
          </Text>
          <Text style={styles.item}>Licence: {profile.license_number}</Text>
          <Text style={styles.meta}>
            {profile.verified
              ? `Approved on ${formatDate(profile.verified_at)}`
              : `Submitted on ${formatDate(profile.created_at)}. Pull down to check for approval.`}
          </Text>

          {status === 'pending' && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditing(true)}>
              <Text style={styles.secondaryBtnText}>Edit details</Text>
            </TouchableOpacity>
          )}
          {status === 'verified' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/ride-requests')}>
              <Text style={styles.primaryBtnText}>See ride requests</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Documents</Text>
        <Text style={styles.item}>
          Document upload isn&apos;t available in the app yet. The GreenRide team checks your driving
          licence, vehicle registration and insurance before approving your account.
        </Text>
      </View>
    </ScrollView>
  );
}

function Step({ number, label, done }: { number: number; label: string; done: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, done && styles.stepDotDone]}>
        <Text style={[styles.stepNumber, done && styles.stepNumberDone]}>{done ? '✓' : number}</Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e3f2fd' },
  container: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#0d47a1' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#334155' },
  loader: { marginVertical: 24 },
  steps: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#93c5fd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  stepDotDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  stepNumber: { fontWeight: '700', color: '#1e3a8a' },
  stepNumberDone: { color: '#fff' },
  stepLabel: { fontWeight: '600', color: '#1e3a8a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  item: { color: '#334155', marginBottom: 4 },
  meta: { color: '#64748b', fontSize: 12, marginTop: 4 },
  errorText: { color: '#b91c1c', marginBottom: 8 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  primaryBtn: {
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  secondaryBtnText: { color: '#1565c0', fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' },
  badgeDone: { color: '#166534', backgroundColor: '#dcfce7' },
  badgePending: { color: '#b45309', backgroundColor: '#fef3c7' },
});
