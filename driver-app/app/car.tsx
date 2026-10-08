import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverWork } from '@/contexts/DriverWorkContext';
import { Button, Card, colors, Field, Header, Icon, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';
import { driversAPI } from '@/services/api';

// The car the Flow team approves. Editable until approved; then locked (as
// on the backend), and changes go through support.
export default function CarScreen() {
  const router = useRouter();
  const { t } = useT();
  const { token } = useAuth();
  const { approval, profile, reloadProfile } = useDriverWork();
  const [make, setMake] = useState(profile?.vehicle_make ?? '');
  const [model, setModel] = useState(profile?.vehicle_model ?? '');
  const [plate, setPlate] = useState(profile?.license_number ?? '');
  const [saving, setSaving] = useState(false);
  const locked = approval === 'verified';

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const details = { vehicle_make: make.trim(), vehicle_model: model.trim(), license_number: plate.trim().toUpperCase() };
      await (profile ? driversAPI.updateMe(token, details) : driversAPI.onboard(token, details));
      await reloadProfile();
      router.replace('/documents');
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title={t('car.title')} onBack={() => router.back()} backLabel={t('common.back')} />
      {approval === 'rejected' && profile?.rejection_reason ? (
        <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft, marginBottom: space.lg }}>
          <Text weight="semibold" color={colors.danger}>{t('approval.rejectedTitle')}</Text>
          <Text color={colors.danger}>{t('approval.rejectedText', { reason: profile.rejection_reason })}</Text>
        </Card>
      ) : null}
      <Text color={colors.ink3} style={{ marginBottom: space.lg }}>{locked ? t('car.locked') : t('car.intro')}</Text>
      <View style={{ gap: space.lg }}>
        <Field label={t('car.make')} value={make} onChangeText={setMake} editable={!locked} placeholder="Toyota" />
        <Field label={t('car.model')} value={model} onChangeText={setModel} editable={!locked} placeholder="Corolla" />
        <Field label={t('car.plate')} value={plate} onChangeText={setPlate} editable={!locked} autoCapitalize="characters" />
        {locked ? (
          <Button size="lg" variant="secondary" icon="file-text" label={t('account.documents')} onPress={() => router.push('/documents')} />
        ) : (
          <Button size="xl" label={profile ? t('common.save') : t('car.submit')} onPress={save} loading={saving}
            disabled={!make.trim() || !model.trim() || !plate.trim()} />
        )}
        {!locked && profile && (
          <Button variant="ghost" label={t('car.next')} onPress={() => router.push('/documents')} />
        )}
      </View>
      {locked && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
          <Icon name="lock" size={16} color={colors.muted} />
          <Text variant="caption" color={colors.muted}>{t('account.approved')}</Text>
        </View>
      )}
    </Screen>
  );
}
