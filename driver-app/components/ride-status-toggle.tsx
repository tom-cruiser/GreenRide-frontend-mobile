import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = { status: boolean; onToggle: () => void; busy?: boolean; disabled?: boolean; locationDenied?: boolean };

// Online = riders nearby can see you and you get ride requests.
export default function RideStatusToggle({ status, onToggle, busy = false, disabled = false, locationDenied = false }: Props) {
  return (
    <View style={styles.statusBox}>
      <Text style={styles.label}>Ride Status</Text>
      <View style={styles.row}>
        <View style={styles.statusText}>
          <Text style={{ color: status ? '#43a047' : '#9e9e9e', fontWeight: 'bold' }}>
            {status ? 'Online' : 'Offline'}
          </Text>
          <Text style={styles.hint}>
            {disabled
              ? 'Available once your account is approved'
              : locationDenied && !status
                ? 'Allow location access so riders can see you'
              : status
                ? 'Riders near you can see you'
                : 'Go online to receive ride requests'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleBtn, status ? styles.active : styles.inactive, disabled && styles.disabled]}
          onPress={onToggle}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.toggleText}>{status ? 'Go Offline' : 'Go Online'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusText: { flex: 1 },
  hint: { color: '#757575', fontSize: 12, marginTop: 2 },
  toggleBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 110,
  },
  active: {
    backgroundColor: '#e53935',
  },
  inactive: {
    backgroundColor: '#43a047',
  },
  disabled: {
    backgroundColor: '#bdbdbd',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
