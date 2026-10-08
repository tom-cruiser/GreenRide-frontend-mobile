import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button, colors, Field, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useT();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError(t('auth.missing'));
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      setError(message === 'NOT_DRIVER' ? t('auth.notDriver') : message || t('auth.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen dark edges={['top', 'bottom']}>
        <Image source={require('@/assets/images/app-logo.png')} style={{ width: 52, height: 52, borderRadius: 26 }} />
        <Text color={colors.onDark} weight="bold" style={{ fontSize: 48, lineHeight: 52, letterSpacing: -1.6, marginTop: space.xxxl }}>
          {t('auth.loginTitle')}
        </Text>
        <Text color={colors.onDarkMuted} style={{ marginTop: space.sm, marginBottom: space.xxl }}>{t('auth.loginText')}</Text>
        <View style={{ gap: space.lg }}>
          <Field dark label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field dark label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submit} />
          {error && <Text color="#FCA5A5">{error}</Text>}
          <Button size="xl" variant="light" label={t('auth.login')} onPress={submit} loading={busy} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
            <Text color={colors.onDarkMuted}>{t('auth.noAccount')}</Text>
            <Button size="md" variant="ghostDark" label={t('auth.createAccount')} onPress={() => router.push('/(auth)/register')}
              style={{ paddingHorizontal: space.sm }} />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
