import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverWork } from '@/contexts/DriverWorkContext';
import { Avatar, Badge, Card, colors, Divider, Header, ListItem, radius, Screen, space, Text } from '@/design';
import { useT, type Locale } from '@/i18n';
import { driversAPI } from '@/services/api';

// Profile, car, documents, help, a few settings, log out.
export default function AccountScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useT();
  const { user, token, logout } = useAuth();
  const { approval, profile } = useDriverWork();
  const [rating, setRating] = useState<{ average: number | null; count: number } | null>(null);

  useFocusEffect(useCallback(() => {
    if (token) driversAPI.getStats(token).then((s) => setRating(s?.rating ?? null)).catch(() => {});
  }, [token]));

  const badge = {
    verified: { label: t('account.approved'), tone: 'dark' as const, icon: 'check-circle' as const },
    pending: { label: t('account.pending'), tone: 'warning' as const, icon: 'clock' as const },
    rejected: { label: t('account.rejected'), tone: 'danger' as const, icon: 'alert-circle' as const },
    not_onboarded: { label: t('account.notOnboarded'), tone: 'neutral' as const, icon: 'file-plus' as const },
  }[approval as 'verified' | 'pending' | 'rejected' | 'not_onboarded'];

  const car = [profile?.vehicle_make, profile?.vehicle_model].filter(Boolean).join(' ');

  return (
    <Screen>
      <Header title={t('account.title')} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <Avatar name={user?.name} size={60} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="heading" weight="bold">{user?.name}</Text>
          {badge && <Badge {...badge} />}
          {rating?.average ? <Text variant="caption" color={colors.muted}>{t('account.ratingLine', { rating: rating.average.toFixed(1), count: rating.count })}</Text> : null}
        </View>
      </Card>

      <Card style={{ marginTop: space.md, paddingVertical: space.sm }}>
        <ListItem icon="user" title={t('account.profile')} subtitle={user?.phone || user?.email} onPress={() => router.push('/profile')} />
        <Divider />
        <ListItem icon="truck" title={t('account.car')} subtitle={car || profile?.license_number || undefined} onPress={() => router.push('/car')} />
        <Divider />
        <ListItem icon="file-text" title={t('account.documents')} onPress={() => router.push('/documents')} />
        <Divider />
        <ListItem icon="help-circle" title={t('account.help')} onPress={() => router.push('/help')} />
      </Card>

      {/* Settings: just the language for now */}
      <Card style={{ marginTop: space.md }}>
        <Text weight="semibold">{t('account.language')}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          {([['fr', 'Français'], ['en', 'English']] as [Locale, string][]).map(([code, name]) => (
            <Pressable key={code} onPress={() => setLocale(code)} accessibilityRole="radio" accessibilityState={{ selected: locale === code }}
              style={{ flex: 1, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
                backgroundColor: locale === code ? colors.ink : colors.soft }}>
              <Text weight="semibold" color={locale === code ? colors.onDark : colors.ink}>{name}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: space.md, paddingVertical: space.sm }}>
        <ListItem icon="log-out" title={t('account.logout')} danger
          onPress={() => Alert.alert(t('account.logoutTitle'), undefined, [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('account.logout'), style: 'destructive', onPress: logout },
          ])} />
      </Card>
    </Screen>
  );
}
