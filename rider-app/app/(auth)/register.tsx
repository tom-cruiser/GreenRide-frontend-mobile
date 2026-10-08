import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button, colors, Field, Header, Screen, space, Text } from '@/design';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) return setError('Fill in your name, email and password.');
    if (password.length < 6) return setError('Use at least 6 characters for your password.');
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await register({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined });
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen dark edges={['top', 'bottom']}>
        <Header onBack={() => router.back()} backLabel="Back" dark />
        <Text color={colors.onDark} weight="bold" style={{ fontSize: 40, lineHeight: 44, letterSpacing: -1.3 }}>Join Flow.</Text>
        <Text color={colors.onDarkMuted} style={{ marginTop: space.sm, marginBottom: space.xxl }}>
          One account to book rides, share them with friends and pay from your wallet.
        </Text>
        <View style={{ gap: space.lg }}>
          <Field dark label="Full name" value={name} onChangeText={setName} autoComplete="name" />
          <Field dark label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field dark label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel"
            hint="With your country code. Friends can invite you to rides with this number." />
          <Field dark label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" hint="At least 6 characters." />
          <Field dark label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
          {error && <Text color="#FCA5A5">{error}</Text>}
          <Button size="lg" variant="light" label="Create my account" onPress={submit} loading={busy} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
            <Text color={colors.onDarkMuted}>Already have an account?</Text>
            <Button size="md" variant="ghostDark" label="Log in" onPress={() => router.back()} style={{ paddingHorizontal: space.sm }} />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
