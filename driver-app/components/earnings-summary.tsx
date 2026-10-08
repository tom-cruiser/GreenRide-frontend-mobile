import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  today: string | number;
  label?: string;
  onViewHistory?: () => void;
};

export default function EarningsSummary({ today, label = "Today's Earnings", onViewHistory }: Props) {
  const display =
    typeof today === 'number' ? `${today.toLocaleString()} FBU` : today;
  return (
    <View style={styles.box}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.amount}>{display}</Text>
      <TouchableOpacity style={styles.historyBtn} onPress={onViewHistory}>
        <Text style={styles.historyText}>View Earnings History</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#111111',
    fontWeight: '600',
    marginBottom: 8,
  },
  amount: {
    fontSize: 28,
    color: '#111111',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  historyBtn: {
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  historyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
