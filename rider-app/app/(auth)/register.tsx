import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button, colors, Field, Header, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) return setError(t('auth.missingRegister'));
    if (password.length < 6) return setError(t('auth.short'));
    if (password !== confirm) return setError(t('auth.mismatch'));
    setBusy(true);
    setError(null);
    try {
      await register({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined });
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.registerFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen dark edges={['top', 'bottom']}>
        <Header onBack={() => router.back()} backLabel={t('common.back')} dark />
        <Text color={colors.onDark} weight="bold" style={{ fontSize: 40, lineHeight: 44, letterSpacing: -1.3 }}>{t('auth.join')}</Text>
        <Text color={colors.onDarkMuted} style={{ marginTop: space.sm, marginBottom: space.xxl }}>
          {t('auth.joinText')}
        </Text>
        <View style={{ gap: space.lg }}>
          <Field dark label={t('auth.fullName')} value={name} onChangeText={setName} autoComplete="name" />
          <Field dark label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field dark label={t('auth.phoneOptional')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel"
            hint={t('auth.phoneHint')} />
          <Field dark label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" hint={t('auth.passwordHint')} />
          <Field dark label={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
          {error && <Text color="#FCA5A5">{error}</Text>}
          <Button size="lg" variant="light" label={t('auth.register')} onPress={submit} loading={busy} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
            <Text color={colors.onDarkMuted}>{t('auth.haveAccount')}</Text>
            <Button size="md" variant="ghostDark" label={t('auth.login')} onPress={() => router.back()} style={{ paddingHorizontal: space.sm }} />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
