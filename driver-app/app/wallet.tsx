import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { walletAPI } from '../services/api';

type Transaction = {
  id: number | string;
  amount: number;
  type?: string;
  description?: string;
  created_at?: string;
};

const formatAmount = (amount: number) => `${amount.toLocaleString()} FBU`;

export default function WalletScreen() {
  const { token, walletBalance, updateWalletBalance } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Please sign in to view your wallet');
      setLoading(false);
      return;
    }
    try {
      await updateWalletBalance();
      const data = await walletAPI.getTransactions(token);
      setTransactions((data?.transactions as Transaction[]) || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, updateWalletBalance]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.balanceLabel}>Current Balance</Text>
      <Text style={styles.balance}>{formatAmount(walletBalance)}</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color="#1976d2" style={{ marginVertical: 12 }} />}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {!loading && transactions.length === 0 && (
          <Text style={styles.empty}>No transactions yet.</Text>
        )}
        {transactions.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc}>
                {tx.description || tx.type || 'Transaction'}
              </Text>
              {tx.created_at && (
                <Text style={styles.txDate}>{tx.created_at}</Text>
              )}
            </View>
            <Text
              style={[
                styles.txAmount,
                tx.amount < 0 ? styles.txDebit : styles.txCredit,
              ]}
            >
              {tx.amount < 0 ? '-' : '+'}
              {formatAmount(Math.abs(tx.amount))}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.info}>
        Detailed ride-by-ride earnings are available in Ride History.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e3f2fd' },
  container: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
    marginBottom: 4,
  },
  balance: {
    fontSize: 32,
    color: '#43a047',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  error: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#475569',
    marginTop: 16,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  empty: { color: '#64748b', fontStyle: 'italic' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  txDesc: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  txDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txDebit: { color: '#b91c1c' },
  txCredit: { color: '#15803d' },
});
