import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, colors, Field, formatMoney, Header, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';
import { driversAPI, walletAPI } from '@/services/api';

// Withdraw to mobile money. The backend checks the minimum and the balance
// again; the checks here only explain the problem before sending.
export default function WithdrawScreen() {
  const router = useRouter();
  const { t } = useT();
  const { token, user, updateWalletBalance } = useAuth();
  const [available, setAvailable] = useState(0);
  const [minimum, setMinimum] = useState(1000);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    walletAPI.getBalance(token).then((r) => setAvailable(r.wallet?.available ?? 0)).catch(() => {});
    driversAPI.getStats(token).then((s) => s?.minWithdrawal && setMinimum(s.minWithdrawal)).catch(() => {});
  }, [token]);

  const value = Number(amount.replace(/\D/g, ''));

  const submit = async () => {
    if (!token) return;
    if (!value || value < minimum) return setError(t('withdraw.tooLow', { amount: formatMoney(minimum) }));
    if (value > available) return setError(t('withdraw.tooHigh'));
    if (phone.replace(/\D/g, '').length < 8) return setError(t('withdraw.badPhone'));
    setError(null);
    setSending(true);
    try {
      await walletAPI.withdraw(token, value, phone.trim());
      updateWalletBalance();
      Alert.alert(t('withdraw.successTitle'), t('withdraw.successText', { amount: formatMoney(value), phone: phone.trim() }), [
        { text: t('common.done'), onPress: () => router.back() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <Header title={t('withdraw.title')} onBack={() => router.back()} backLabel={t('common.back')} />
      <Card dark>
        <Text color={colors.onDarkMuted}>{t('earnings.available')}</Text>
        <Text variant="title" color={colors.onDark}>{formatMoney(available)}</Text>
      </Card>
      <View style={{ gap: space.lg, marginTop: space.xl }}>
        <Field label={t('withdraw.amount')} keyboardType="number-pad" value={amount} onChangeText={setAmount}
          placeholder={String(minimum)} hint={t('withdraw.min', { amount: formatMoney(minimum) })} />
        <Field label={t('withdraw.phone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone}
          hint={t('withdraw.phoneHint')} autoComplete="tel" />
        {error && <Text color={colors.danger}>{error}</Text>}
        <Button size="xl" label={value ? t('withdraw.submit', { amount: formatMoney(value) }) : t('withdraw.title')}
          onPress={submit} loading={sending} />
      </View>
    </Screen>
  );
}
