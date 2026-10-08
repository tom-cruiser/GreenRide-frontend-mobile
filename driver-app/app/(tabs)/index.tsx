import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverAvailability } from '@/contexts/DriverAvailabilityContext';
import { driverEarns, useDriverWork, type RideRequest } from '@/contexts/DriverWorkContext';
import { Badge, Button, Card, colors, formatKm, formatMoney, Icon, IconButton, radius, shadow, space, Text } from '@/design';
import { useT } from '@/i18n';
import { driversAPI } from '@/services/api';

// react-native-maps is native; without it (some builds) the map is a plain panel.
const maps = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('react-native-maps');
    return { MapView: m.default, Marker: m.Marker };
  } catch {
    return null;
  }
})();

// Default centre until the phone's position is known.
const FALLBACK = { latitude: -3.3822, longitude: 29.3644 };

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useT();
  const { token } = useAuth();
  const { online, busy, toggle } = useDriverAvailability();
  const { approval, profile, requests, payoutPercent, unread, reloadProfile } = useDriverWork();
  const [today, setToday] = useState<number | null>(null);
  const [here, setHere] = useState<{ latitude: number; longitude: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      driversAPI.getStats(token).then((s) => setToday(s?.earnings?.today ?? 0)).catch(() => {});
      Location.getForegroundPermissionsAsync()
        .then((p) => (p.status === 'granted' ? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }) : null))
        .then((pos) => pos && setHere({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        .catch(() => {});
    }, [token]),
  );

  const region = useMemo(() => ({ ...(here ?? FALLBACK), latitudeDelta: 0.03, longitudeDelta: 0.03 }), [here]);
  const verified = approval === 'verified';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Map: the driver's position and, while online, where requests start. */}
      {maps ? (
        <maps.MapView style={StyleSheet.absoluteFill} region={region} showsUserLocation showsMyLocationButton={false}>
          {online && requests.filter((r) => r.pickup_lat != null && r.pickup_lng != null).map((r) => (
            <maps.Marker key={r.id} coordinate={{ latitude: r.pickup_lat!, longitude: r.pickup_lng! }} pinColor={colors.ink}
              onPress={() => router.push(`/request/${r.id}`)} />
          ))}
        </maps.MapView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noMap]}>
          <Icon name="map" size={32} color={colors.muted} />
          <Text color={colors.muted} style={{ marginTop: space.sm }}>{t('home.mapOff')}</Text>
        </View>
      )}

      {/* Top: today's earnings and the bell */}
      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <Card style={styles.todayCard} padded={false} onPress={() => router.push('/(tabs)/earnings')}>
            <Text variant="caption" color={colors.muted}>{t('home.today')}</Text>
            <Text variant="heading" weight="bold">{today == null ? '—' : formatMoney(today)}</Text>
          </Card>
          <IconButton icon="bell" label={t('home.notifications')} count={unread} onPress={() => router.push('/notifications')} size={52} />
        </View>
      </SafeAreaView>

      {/* Bottom sheet: status, the big button, requests */}
      <View style={styles.sheet}>
        {approval === 'loading' ? (
          <ActivityIndicator color={colors.ink} style={{ paddingVertical: space.xxl }} />
        ) : !verified ? (
          <ApprovalCard approval={approval} reason={profile?.rejection_reason} onRetry={reloadProfile} />
        ) : (
          <>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: online ? colors.ink : colors.muted }]} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{online ? t('home.online') : t('home.offline')}</Text>
                <Text color={colors.ink3}>{online ? t('home.onlineHint') : t('home.offlineHint')}</Text>
              </View>
              {online && <ActivityIndicator color={colors.ink} />}
            </View>
            <Button
              size="xl"
              label={online ? t('home.goOffline') : t('home.goOnline')}
              variant={online ? 'secondary' : 'primary'}
              icon={online ? 'pause-circle' : 'power'}
              loading={busy}
              onPress={toggle}
              style={{ marginTop: space.lg }}
            />
            {online && (
              <View style={{ marginTop: space.xl }}>
                <Text variant="overline" color={colors.muted}>{t('home.requests')}</Text>
                {requests.length === 0 ? (
                  <Text color={colors.ink3} style={{ marginTop: space.sm }}>{t('home.noRequests')}</Text>
                ) : (
                  <ScrollView style={{ maxHeight: 240, marginTop: space.sm }} contentContainerStyle={{ gap: space.sm }}>
                    {requests.map((r) => (
                      <RequestRow key={r.id} req={r} earn={driverEarns(r, payoutPercent)} onPress={() => router.push(`/request/${r.id}`)} />
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function RequestRow({ req, earn, onPress }: { req: RideRequest; earn: number; onPress: () => void }) {
  const { t } = useT();
  const group = (req.riders_count ?? 1) > 1;
  return (
    <Card onPress={onPress} style={styles.reqRow} padded={false}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="semibold" numberOfLines={1}>{req.pickup} → {req.dropoff}</Text>
        <Text variant="caption" color={colors.muted}>
          {formatKm(req.distance)}{group ? ` · ${t('request.group', { n: req.riders_count ?? 1 })}` : ''}
        </Text>
      </View>
      <Text variant="heading" weight="bold">{formatMoney(earn)}</Text>
    </Card>
  );
}

function ApprovalCard({ approval, reason, onRetry }: { approval: string; reason?: string | null; onRetry: () => void }) {
  const router = useRouter();
  const { t } = useT();
  if (approval === 'error') {
    return (
      <View style={{ gap: space.md }}>
        <Text color={colors.ink3}>{t('common.network')}</Text>
        <Button label={t('common.retry')} variant="secondary" onPress={onRetry} />
      </View>
    );
  }
  const map = {
    not_onboarded: { icon: 'file-plus' as const, title: t('approval.notOnboardedTitle'), text: t('approval.notOnboardedText'), action: t('approval.notOnboardedAction'), tone: 'neutral' as const },
    pending: { icon: 'clock' as const, title: t('approval.pendingTitle'), text: t('approval.pendingText'), action: t('approval.pendingAction'), tone: 'warning' as const },
    rejected: {
      icon: 'alert-circle' as const, title: t('approval.rejectedTitle'),
      text: reason ? t('approval.rejectedText', { reason }) : t('approval.rejectedNoReason'),
      action: t('approval.rejectedAction'), tone: 'danger' as const,
    },
  }[approval as 'not_onboarded' | 'pending' | 'rejected'];
  if (!map) return null;
  return (
    <View style={{ gap: space.md }}>
      <Badge label={t(`account.${approval === 'not_onboarded' ? 'notOnboarded' : (approval as 'pending' | 'rejected')}`)} tone={map.tone} icon={map.icon} />
      <Text variant="title">{map.title}</Text>
      <Text color={colors.ink3}>{map.text}</Text>
      <Button size="xl" label={map.action} icon="arrow-right" onPress={() => router.push('/car')} />
    </View>
  );
}

const styles = StyleSheet.create({
  noMap: { backgroundColor: colors.soft2, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: space.lg, paddingTop: space.sm },
  todayCard: { paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.lg },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.xl, paddingBottom: space.xl, ...shadow.float,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 14, height: 14, borderRadius: 7 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
});
