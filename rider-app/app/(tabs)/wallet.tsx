import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AppLogo from '../../components/app-logo';
import { useAuth } from '../../contexts/AuthContext';
import { walletAPI } from '../../services/api';

export default function WalletScreen() {
  const router = useRouter();
  const { user, token, walletBalance } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user || !token) return;
      setLoadingTx(true);
      try {
        const resp = await walletAPI.getTransactions(token, user.id);
        setTransactions(resp.transactions ?? []);
      } catch {
        setTransactions([]);
      } finally {
        setLoadingTx(false);
      }
    };
    load();
  }, [user, token]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.goBack} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.goBackText}>{'< Go Back'}</Text>
      </TouchableOpacity>
      <View style={styles.header}>
        <AppLogo size={60} />
        <Text style={styles.title}>Wallet</Text>
      </View>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>{walletBalance.toLocaleString()} FBU</Text>
        <Text style={styles.bonus}>Includes bonuses (if any)</Text>
      </View>
      <TouchableOpacity style={styles.topUpButton}>
        <Text style={styles.topUpText}>Top Up Wallet</Text>
      </TouchableOpacity>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {loadingTx ? (
          <View style={{ paddingVertical: 18 }}>
            <ActivityIndicator />
          </View>
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet.</Text>
        ) : (
          transactions.map((tx) => (
            <View key={String(tx.id)} style={styles.transactionRow}>
              <Image source={require('../../assets/images/app-logo.png')} style={styles.txnIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.txnTitle}>{tx.type}</Text>
                <Text style={styles.txnDate}>{tx.date}</Text>
              </View>
              <Text
                style={[
                  styles.txnAmount,
                  tx.direction === 'incoming' ? { color: '#16A34A' } : { color: '#DC2626' },
                ]}
              >
                {tx.direction === 'incoming' ? '+' : '-'}{Number(tx.amount).toLocaleString()} FBU
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  goBack: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F6F6F6',
  },
  goBackText: {
    color: '#0B0B0B',
    fontWeight: '700',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0B0B0B',
    marginLeft: 12,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0B0B0B',
  },
  bonus: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '600',
  },
  topUpButton: {
    backgroundColor: '#0B0B0B',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  topUpText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 1,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  txnIcon: {
    width: 36,
    height: 36,
    marginRight: 12,
    borderRadius: 8,
  },
  txnTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
  },
  txnDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  txnAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 8,
  },
  emptyText: {
    color: '#6B7280',
    paddingVertical: 10,
  },
});
