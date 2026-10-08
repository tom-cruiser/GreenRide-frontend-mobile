import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { driverEarns, useDriverWork } from '@/contexts/DriverWorkContext';
import { Badge, Button, colors, formatKm, formatMoney, Icon, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';
import { ridesAPI } from '@/services/api';

// A new ride request, on top of everything: what the driver earns, where,
// how far, solo or a group, and two big buttons. No countdown: the backend
// keeps a request open until a driver takes it or the rider cancels.
export default function RequestScreen() {
  const router = useRouter();
  const { t } = useT();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requestById, forgetRequest, refreshActive, payoutPercent } = useDriverWork();
  const req = requestById(Number(id));
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!req) {
    return (
      <Screen dark scroll={false} contentStyle={styles.center} edges={['top', 'bottom']}>
        <Icon name="slash" size={40} color={colors.onDarkMuted} />
        <Text variant="title" color={colors.onDark} align="center" style={{ marginTop: space.lg }}>{t('request.gone')}</Text>
        <Button label={t('common.close')} variant="light" onPress={close} style={{ marginTop: space.xxl, alignSelf: 'stretch' }} />
      </Screen>
    );
  }

  const riders = Math.max(1, req.riders_count ?? 1);
  const group = req.share_mode === 'friends' && riders > 1;

  const accept = async () => {
    if (!token) return;
    setBusy('accept');
    try {
      await ridesAPI.acceptRide(token, req.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      forgetRequest(req.id);
      await refreshActive();
      router.replace('/ride');
    } catch (e) {
      forgetRequest(req.id);
      Alert.alert(t('request.acceptError'), e instanceof Error ? e.message : t('common.error'), [{ text: t('common.close'), onPress: close }]);
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    if (!token) return;
    setBusy('decline');
    forgetRequest(req.id);
    // Hidden for this driver either way; a failed call only means it may come back.
    await ridesAPI.declineRide(token, req.id).catch(() => {});
    setBusy(null);
    close();
  };

  return (
    <Screen dark edges={['top', 'bottom']} contentStyle={{ flexGrow: 1 }}>
      <Text variant="overline" color={colors.onDarkMuted}>{t('request.title')}</Text>

      <View style={{ marginTop: space.xl }}>
        <Text color={colors.onDarkMuted}>{t('request.youEarn')}</Text>
        <Text color={colors.onDark} weight="extrabold" style={{ fontSize: 52, lineHeight: 58, letterSpacing: -1.5 }}>
          {formatMoney(driverEarns(req, payoutPercent))}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          <Badge tone="light" icon={group ? 'users' : 'user'} label={group ? t('request.group', { n: riders }) : req.is_shared ? t('request.shared') : t('request.solo')} />
          <Badge tone="light" icon="navigation" label={formatKm(req.distance)} />
        </View>
        {group && req.group_fare != null && (
          <Text color={colors.onDarkMuted} style={{ marginTop: space.sm }}>{t('request.groupTotal', { amount: formatMoney(req.group_fare) })}</Text>
        )}
      </View>

      {/* Route: pickup, then drop-off */}
      <View style={styles.route}>
        <Stop icon="circle" label={t('request.pickup')} place={req.pickup} />
        <View style={styles.line} />
        <Stop icon="map-pin" label={t('request.dropoff')} place={req.dropoff} />
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ gap: space.md, marginTop: space.xxl }}>
        <Button size="xl" variant="light" icon="check" label={t('request.accept')} onPress={accept} loading={busy === 'accept'} disabled={busy !== null} />
        <Button size="lg" variant="ghostDark" label={t('request.decline')} onPress={decline} disabled={busy !== null}
          style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }} />
      </View>
    </Screen>
  );
}

function Stop({ icon, label, place }: { icon: 'circle' | 'map-pin'; label: string; place: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' }}>
      <View style={styles.stopIcon}><Icon name={icon} size={18} color={colors.ink} /></View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color={colors.onDarkMuted}>{label}</Text>
        <Text variant="heading" color={colors.onDark}>{place}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  route: { marginTop: space.xxxl, padding: space.xl, borderRadius: 24, backgroundColor: colors.night2, gap: space.xs },
  line: { width: 2, height: 22, backgroundColor: 'rgba(255,255,255,0.25)', marginLeft: 17 },
  stopIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.onDark, alignItems: 'center', justifyContent: 'center' },
});
