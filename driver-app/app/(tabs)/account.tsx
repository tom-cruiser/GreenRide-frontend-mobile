import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DriverAvatar } from '@/components/driver-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverWork } from '@/contexts/DriverWorkContext';
import { Badge, colors, Icon, type IconName, radius, shadow, space, Text } from '@/design';
import { useT, type Locale } from '@/i18n';
import { driversAPI } from '@/services/api';

// Account, in the rider app's card style: the driver (tap for the profile),
// then car, documents, help, the language, and log out.
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
  const links: [IconName, string, string | undefined, () => void][] = [
    ['user', t('account.profile'), user?.phone || user?.email, () => router.push('/profile')],
    ['truck', t('account.car'), car || profile?.license_number || undefined, () => router.push('/car')],
    ['file-text', t('account.documents'), undefined, () => router.push('/documents')],
    ['help-circle', t('account.help'), undefined, () => router.push('/help')],
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text variant="title">{t('account.title')}</Text>

        {/* The driver: photo, name, approval, rating */}
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={t('account.profile')}
          style={({ pressed }) => [styles.hero, pressed && { opacity: 0.85 }]}>
          <View style={styles.photoRing}>
            <DriverAvatar name={user?.name} photoUrl={user?.photoUrl} size={96} />
          </View>
          <Text variant="title" style={{ marginTop: space.lg }}>{user?.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
            {badge && <Badge {...badge} />}
            {rating?.average ? (
              <Text variant="caption" weight="semibold" color={colors.ink3}>
                {t('account.ratingLine', { rating: rating.average.toFixed(1), count: rating.count })}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {/* Profile, car, documents, help */}
        <View style={styles.group}>
          {links.map(([icon, title, subtitle, onPress], i) => (
            <Pressable key={title} onPress={onPress} accessibilityRole="button"
              style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { opacity: 0.7 }]}>
              <View style={styles.rowIcon}><Icon name={icon} size={18} /></View>
              <View style={{ flex: 1 }}>
                <Text weight="medium">{title}</Text>
                {subtitle ? <Text variant="caption" color={colors.muted} numberOfLines={1}>{subtitle}</Text> : null}
              </View>
              <Icon name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {/* Settings: just the language for now */}
        <Text variant="heading" weight="bold" style={styles.section}>{t('account.language')}</Text>
        <View style={styles.langs}>
          {([['fr', 'Français'], ['en', 'English']] as [Locale, string][]).map(([code, name]) => (
            <Pressable key={code} onPress={() => setLocale(code)} accessibilityRole="radio" accessibilityState={{ selected: locale === code }}
              style={[styles.lang, locale === code && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
              <Text weight="semibold" color={locale === code ? colors.onDark : colors.ink}>{name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.group, { marginTop: space.xxl }]}>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() => Alert.alert(t('account.logoutTitle'), undefined, [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('account.logout'), style: 'destructive', onPress: logout },
            ])}>
            <View style={styles.rowIcon}><Icon name="log-out" size={18} color={colors.danger} /></View>
            <Text weight="medium" style={{ flex: 1 }} color={colors.danger}>{t('account.logout')}</Text>
            <Icon name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, paddingBottom: space.xxxl },
  hero: { alignItems: 'center', marginTop: space.xl, marginBottom: space.xxl },
  photoRing: { padding: 4, borderRadius: 56, backgroundColor: colors.surface, ...shadow.card },
  group: { backgroundColor: colors.bg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  rowIcon: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { marginTop: space.xxl, marginBottom: space.md },
  langs: { flexDirection: 'row', gap: space.sm },
  lang: {
    flex: 1, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line,
  },
});
