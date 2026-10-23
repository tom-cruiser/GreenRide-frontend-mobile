import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInputFlow as TextInput, formatMoney, IconButton } from '@/design';
import { useFocusEffect, useRouter } from 'expo-router';
import AppLogo from '../../components/app-logo';
import { useAuth } from '../../contexts/AuthContext';
import { paymentsAPI, walletAPI } from '../../services/api';
import { formatTxDate, toTransactionRows, type TransactionRow } from '../../utils/transactions';
import { useT } from '@/i18n';

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];
const PAYMENT_POLL_MS = 3000;

type Payment = {
  id: number;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  provider: string;
  failure_reason: string | null;
};

export default function WalletScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { user, token, walletBalance, updateWalletBalance } = useAuth();
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [topUpVisible, setTopUpVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [starting, setStarting] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [confirming, setConfirming] = useState(false);
  const finishedPayment = useRef<number | null>(null);
  const [bonusPercent, setBonusPercent] = useState<number | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!token) return;
    setLoadingTx(true);
    try {
      const resp = await walletAPI.getTransactions(token);
      setRows(toTransactionRows(resp.transactions ?? [], {
        topup: t('wallet.txTopup'),
        topupBonus: t('wallet.txBonus'),
        withdrawal: t('wallet.txWithdrawal'),
        rideFare: t('wallet.txFare'),
        rideEarnings: t('wallet.txEarnings'),
      }));
    } catch {
      setRows([]);
    } finally {
      setLoadingTx(false);
    }
  }, [token, t]);

  useFocusEffect(
    useCallback(() => {
      updateWalletBalance();
      loadTransactions();
      paymentsAPI.topupBonusPercent().then(setBonusPercent).catch(() => {});
    }, [updateWalletBalance, loadTransactions]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([updateWalletBalance(), loadTransactions()]);
    setRefreshing(false);
  };

  const closeTopUp = () => {
    setTopUpVisible(false);
    setPayment(null);
    setAmount('');
  };

  const onPaymentSettled = useCallback(
    (settled: Payment) => {
      if (finishedPayment.current === settled.id) return;
      finishedPayment.current = settled.id;
      if (settled.status === 'succeeded') {
        updateWalletBalance();
        loadTransactions();
        closeTopUp();
        Alert.alert(t('wallet.complete'), t('wallet.completeText', { amount: formatMoney(settled.amount) }));
      } else {
        Alert.alert(t('wallet.failed'), settled.failure_reason ?? t('wallet.notCompleted'));
        setPayment(null);
      }
    },
    [updateWalletBalance, loadTransactions, t],
  );

  // While a payment waits for approval, check its status every few seconds.
  useEffect(() => {
    if (!payment || payment.status !== 'pending' || !token) return;
    const timer = setInterval(async () => {
      try {
        const { payment: latest } = await paymentsAPI.getPayment(token, payment.id);
        if (latest.status !== 'pending') onPaymentSettled(latest);
      } catch {
        // Keep waiting; a network blip shouldn't cancel the payment.
      }
    }, PAYMENT_POLL_MS);
    return () => clearInterval(timer);
  }, [payment, token, onPaymentSettled]);

  const startTopUp = async () => {
    if (!token) return;
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      Alert.alert(t('wallet.invalid'), t('wallet.invalidText'));
      return;
    }
    setStarting(true);
    try {
      const resp = await walletAPI.topUp(token, value, phone.trim() || undefined);
      setPayment(resp.payment);
    } catch (e) {
      Alert.alert(t('wallet.failed'), e instanceof Error ? e.message : t('common.tryAgain'));
    } finally {
      setStarting(false);
    }
  };

  // Fake provider only: stands in for approving the mobile-money prompt.
  const simulateApproval = async () => {
    if (!token || !payment) return;
    setConfirming(true);
    try {
      const { payment: settled } = await paymentsAPI.devConfirm(token, payment.id);
      onPaymentSettled(settled);
    } catch (e) {
      Alert.alert(t('wallet.confirmFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
        <IconButton icon="chevron-left" label={t('common.back')} onPress={() => router.replace('/(tabs)')} />
      </View>
      <View style={styles.header}>
        <AppLogo size={60} />
        <Text style={styles.title}>{t('wallet.title')}</Text>
      </View>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
        <Text style={styles.balanceAmount}>{formatMoney(walletBalance)}</Text>
        <Text style={styles.bonus}>{t('wallet.bonuses')}</Text>
      </View>
      <TouchableOpacity style={styles.topUpButton} onPress={() => setTopUpVisible(true)}>
        <Text style={styles.topUpText}>{t('wallet.topUp')}</Text>
      </TouchableOpacity>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('wallet.recent')}</Text>
        {loadingTx && rows.length === 0 ? (
          <View style={{ paddingVertical: 18 }}>
            <ActivityIndicator />
          </View>
        ) : rows.length === 0 ? (
          <Text style={styles.emptyText}>{t('wallet.empty')}</Text>
        ) : (
          rows.map((row) => (
            <View key={row.key} style={styles.transactionRow}>
              <Image source={require('../../assets/images/app-logo.png')} style={styles.txnIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.txnTitle}>{row.label}</Text>
                <Text style={styles.txnDate}>{formatTxDate(row.date, locale)}</Text>
              </View>
              <Text
                style={[
                  styles.txnAmount,
                  row.direction === 'incoming' ? { color: '#111111' } : { color: '#DC2626' },
                ]}
              >
                {row.direction === 'incoming' ? '+' : '-'}{formatMoney(row.amount)}
              </Text>
            </View>
          ))
        )}
      </View>

      <Modal visible={topUpVisible} transparent animationType="slide" onRequestClose={closeTopUp}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!payment ? (
              <>
                <Text style={styles.modalTitle}>{t('wallet.modalTitle')}</Text>
                <View style={styles.chips}>
                  {QUICK_AMOUNTS.map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.chip, amount === String(value) && styles.chipSelected]}
                      onPress={() => setAmount(String(value))}
                    >
                      <Text style={[styles.chipText, amount === String(value) && styles.chipTextSelected]}>
                        {formatMoney(value, '').trim()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.inputLabel}>{t('wallet.amount')}</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder={t('wallet.amountPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.inputLabel}>{t('wallet.phone')}</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+257 ..."
                  placeholderTextColor="#9CA3AF"
                />
                {bonusPercent ? <Text style={styles.modalHint}>{t('wallet.bonusHint', { percent: bonusPercent })}</Text> : null}
                <TouchableOpacity
                  style={[styles.modalPrimary, starting && { opacity: 0.6 }]}
                  onPress={startTopUp}
                  disabled={starting}
                >
                  {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>{t('wallet.continue')}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSecondary} onPress={closeTopUp}>
                  <Text style={styles.modalSecondaryText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{t('wallet.waiting')}</Text>
                <ActivityIndicator color="#0B0B0B" style={{ marginVertical: 12 }} />
                <Text style={styles.modalHint}>
                  {t('wallet.waitingText', { amount: formatMoney(payment.amount) })}
                </Text>
                {payment.provider === 'fake' && (
                  <TouchableOpacity
                    style={[styles.modalPrimary, confirming && { opacity: 0.6 }]}
                    onPress={simulateApproval}
                    disabled={confirming}
                  >
                    <Text style={styles.modalPrimaryText}>
                      {confirming ? t('wallet.confirming') : t('wallet.simulate')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.modalSecondary} onPress={closeTopUp}>
                  <Text style={styles.modalSecondaryText}>{t('common.close')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0B0B0B', marginBottom: 12, textAlign: 'center' },
  modalHint: { color: '#4B5563', textAlign: 'center', marginVertical: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, justifyContent: 'center' },
  chip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipSelected: { backgroundColor: '#0B0B0B', borderColor: '#0B0B0B' },
  chipText: { color: '#111827', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#0f172a', marginBottom: 12 },
  modalPrimary: { backgroundColor: '#0B0B0B', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalSecondary: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  modalSecondaryText: { color: '#4B5563', fontWeight: '700' },
});
