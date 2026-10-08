import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button, colors, Field, Screen, space, Text } from '@/design';

// Dark sign-in, as on the website and the driver app.
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen dark edges={['top', 'bottom']}>
        <Image source={require('@/assets/images/app-logo.png')} style={{ width: 52, height: 52, borderRadius: 26 }} />
        <Text color={colors.onDark} weight="bold" style={{ fontSize: 44, lineHeight: 48, letterSpacing: -1.5, marginTop: space.xxxl }}>
          Welcome back.
        </Text>
        <Text color={colors.onDarkMuted} style={{ marginTop: space.sm, marginBottom: space.xxl }}>
          Sign in to book rides, share them with friends and pay with your Flow wallet.
        </Text>
        <View style={{ gap: space.lg }}>
          <Field dark label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field dark label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submit} />
          {error && <Text color="#FCA5A5">{error}</Text>}
          <Button size="lg" variant="light" label="Log in" onPress={submit} loading={busy} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
            <Text color={colors.onDarkMuted}>New to Flow?</Text>
            <Button size="md" variant="ghostDark" label="Create an account" onPress={() => router.push('/(auth)/register')} style={{ paddingHorizontal: space.sm }} />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
