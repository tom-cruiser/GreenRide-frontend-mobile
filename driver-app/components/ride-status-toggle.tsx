import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function RideStatusToggle({ status, onToggle }) {
  return (
    <View style={styles.statusBox}>
      <Text style={styles.label}>Ride Status</Text>
      <View style={styles.row}>
        <Text style={{ color: status ? '#43a047' : '#bdbdbd', fontWeight: 'bold' }}>
          {status ? 'Active' : 'Inactive'}
        </Text>
        <TouchableOpacity style={[styles.toggleBtn, status ? styles.active : styles.inactive]} onPress={onToggle}>
          <Text style={styles.toggleText}>{status ? 'Go Offline' : 'Go Online'}</Text>
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
  },
  toggleBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#e53935',
  },
  inactive: {
    backgroundColor: '#43a047',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
