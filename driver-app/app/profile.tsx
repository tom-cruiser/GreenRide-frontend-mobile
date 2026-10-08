import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, Button, colors, Field, Header, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useT();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      Alert.alert(t('common.saved'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title={t('profile.title')} onBack={() => router.back()} backLabel={t('common.back')} />
      <View style={{ alignItems: 'center', marginBottom: space.xl }}><Avatar name={name} size={80} /></View>
      <View style={{ gap: space.lg }}>
        <Field label={t('profile.name')} value={name} onChangeText={setName} autoComplete="name" />
        <Field label={t('profile.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel"
          hint={t('auth.phoneHint')} />
        <View style={{ gap: 6 }}>
          <Text variant="label">{t('profile.email')}</Text>
          <Text color={colors.ink3}>{user?.email}</Text>
        </View>
        <Button size="xl" label={t('common.save')} onPress={save} loading={saving} disabled={!name.trim()} />
      </View>
    </Screen>
  );
}
