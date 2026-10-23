import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { DeparturePicker } from '@/components/departure-picker';
import { DriverAvatar } from '@/components/driver-avatar';
import FlowMap from '@/components/flow-map';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, colors, formatKm, formatMoney, Header, Icon, radius, Screen, shadow, space, Text } from '@/design';
import { useT } from '@/i18n';
import { photoSource } from '@/services/api';
import { scheduledAPI, type ScheduledTrip } from '@/services/scheduled';
import { signalingClient } from '@/services/signalingClient';
import { departureLabel } from '@/utils/departure';

// A trip the driver hosts: when it leaves (they can change it; riders are
// told), the path, who booked how many seats and where they get on (with
// their number), and the next step: start, complete or cancel.

export default function HostedTripScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const { token } = useAuth();
  const [trip, setTrip] = useState<ScheduledTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [moving, setMoving] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setTrip((await scheduledAPI.get(token, id)).trip);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }, [token, id, t]);

  useEffect(() => {
    // Deferred a tick so no state is set during the effect itself.
    Promise.resolve().then(load);
    return signalingClient.on('scheduled:updated', (msg: { tripId?: number }) => {
      if (String(msg?.tripId) === String(id)) load();
    });
  }, [load, id]);

  const run = async (name: string, fn: () => Promise<{ trip: ScheduledTrip }>, failTitle: string) => {
    setBusy(name);
    try {
      setTrip((await fn()).trip);
    } catch (e) {
      Alert.alert(failTitle, e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(null);
    }
  };

  if (!trip) {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        {error ? <Text color={colors.ink3} align="center">{error}</Text> : <ActivityIndicator size="large" color={colors.ink} />}
      </Screen>
    );
  }

  const places = [trip.origin, ...trip.stops, trip.destination];
  const booked = (trip.bookings ?? []).filter((b) => b.status !== 'cancelled');
  const cancelled = (trip.bookings ?? []).filter((b) => b.status === 'cancelled');
  const seatsBooked = trip.seatsTotal - trip.seatsLeft;
  const expected = booked.reduce((sum, b) => sum + b.amount, 0);
  const car = [trip.car.color, trip.car.make, trip.car.model].filter(Boolean).join(' ');
  const statusLine = {
    scheduled: departureLabel(trip.departureAt, locale, t),
    in_progress: t('scheduled.underWay'),
    completed: t('scheduled.completed'),
    cancelled: t('scheduled.cancelled'),
  }[trip.status];

  const start = () =>
    Alert.alert(t('scheduled.startTitle'), t('scheduled.startText', { count: booked.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('scheduled.start'), onPress: () => run('start', () => scheduledAPI.start(token!, trip.id), t('scheduled.startFailed')) },
    ]);
  const complete = () =>
    Alert.alert(t('scheduled.completeTitle'), t('scheduled.completeText', { price: formatMoney(expected, trip.currency) }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('scheduled.complete'), onPress: () => run('complete', () => scheduledAPI.complete(token!, trip.id), t('scheduled.completeFailed')) },
    ]);
  const cancel = () =>
    Alert.alert(t('scheduled.cancelTitle'), booked.length ? t('scheduled.cancelTextRiders', { count: booked.length }) : t('scheduled.cancelText'), [
      { text: t('scheduled.keep'), style: 'cancel' },
      { text: t('scheduled.cancelTrip'), style: 'destructive', onPress: () => run('cancel', () => scheduledAPI.cancel(token!, trip.id), t('scheduled.cancelFailed')) },
    ]);
  const saveTime = () => {
    if (!moving) return;
    const when = moving;
    setMoving(null);
    run('time', () => scheduledAPI.update(token!, trip.id, { departureAt: when.toISOString() }), t('scheduled.timeFailed'));
  };

  return (
    <Screen>
      <Header title={t('scheduled.hosted')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/scheduled'))} backLabel={t('common.back')} />

      {/* When, seats, money */}
      <Card dark>
        <Text variant="overline" color={colors.onDarkMuted}>{statusLine}</Text>
        <Text variant="title" color={colors.onDark} style={{ marginTop: space.xs }}>{trip.origin.name} → {trip.destination.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          <Badge tone="light" icon="users" label={t('scheduled.seatsBooked', { count: seatsBooked, total: trip.seatsTotal })} />
          <Badge tone="light" icon="tag" label={t('scheduled.perSeatPrice', { price: formatMoney(trip.pricePerSeat, trip.currency) })} />
          {trip.distanceKm != null && <Badge tone="light" icon="navigation" label={formatKm(trip.distanceKm)} />}
        </View>
        <Text color={colors.onDarkMuted} style={{ marginTop: space.lg }}>{t('scheduled.riderPay')}</Text>
        <Text color={colors.onDark} weight="extrabold" style={{ fontSize: 32, lineHeight: 38 }}>{formatMoney(expected, trip.currency)}</Text>
      </Card>

      {/* Next step */}
      <View style={{ gap: space.sm, marginTop: space.lg }}>
        {trip.status === 'scheduled' && (
          <>
            <Button size="xl" label={t('scheduled.start')} icon="navigation" onPress={start} loading={busy === 'start'} />
            <Button variant="secondary" icon="clock" label={t('scheduled.changeTime')} onPress={() => setMoving(new Date(trip.departureAt))} loading={busy === 'time'} />
          </>
        )}
        {trip.status === 'in_progress' && (
          <Button size="xl" label={t('scheduled.complete')} icon="check" onPress={complete} loading={busy === 'complete'} />
        )}
      </View>

      {/* Riders */}
      <Text variant="heading" style={styles.section}>{t('scheduled.riders')}</Text>
      {booked.length === 0 ? (
        <Card><Text color={colors.ink3}>{trip.status === 'scheduled' ? t('scheduled.noRidersYet') : t('scheduled.noRiders')}</Text></Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {booked.map((b) => (
            <Card key={b.id} style={styles.riderRow}>
              <DriverAvatar name={b.firstName} photoUrl={b.photoUrl} size={48} />
              <View style={{ flex: 1 }}>
                <Text weight="semibold">{b.firstName}</Text>
                <Text variant="caption" color={colors.muted}>
                  {t(b.seats > 1 ? 'scheduled.seatsN' : 'scheduled.seat1', { count: b.seats })} · {t('scheduled.getsOnAt', { place: b.pickup })}
                </Text>
                <Text variant="caption" weight="semibold">{formatMoney(b.amount, trip.currency)}</Text>
              </View>
              {b.phone && b.status === 'booked' && (
                <Pressable onPress={() => Linking.openURL(`tel:${b.phone!.replace(/[^\d+]/g, '')}`).catch(() => {})}
                  style={styles.call} accessibilityRole="button" accessibilityLabel={t('scheduled.callRider', { name: b.firstName })}>
                  <Icon name="phone" size={18} color={colors.onDark} />
                </Pressable>
              )}
            </Card>
          ))}
        </View>
      )}
      {cancelled.length > 0 && (
        <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>
          {t('scheduled.cancelledBookings', { count: cancelled.length })}
        </Text>
      )}

      {/* Path */}
      <Text variant="heading" style={styles.section}>{t('scheduled.route')}</Text>
      <View style={styles.map}>
        <FlowMap
          style={StyleSheet.absoluteFill}
          center={{ latitude: trip.origin.lat, longitude: trip.origin.lng }}
          controls={false}
          route={trip.geometry}
          fitTo={places.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
          pins={places.map((p, i) => ({ id: `p${i}`, latitude: p.lat, longitude: p.lng, title: p.name, color: i === 0 || i === places.length - 1 ? colors.ink : colors.ink3 }))}
        />
      </View>
      <Card style={{ marginTop: space.md }}>
        {places.map((p, i) => (
          <View key={`${p.name}-${i}`} style={{ flexDirection: 'row', gap: space.md, paddingVertical: space.xs }}>
            <Icon name={i === 0 ? 'circle' : i === places.length - 1 ? 'map-pin' : 'more-vertical'} size={16} color={colors.ink3} />
            <Text weight={i === 0 || i === places.length - 1 ? 'semibold' : 'regular'}>{p.name}</Text>
          </View>
        ))}
      </Card>

      {/* Car */}
      <Card style={{ marginTop: space.md }}>
        {trip.car.photoUrl && token && <Image source={photoSource(trip.car.photoUrl, token)} style={styles.carPhoto} contentFit="cover" />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: trip.car.photoUrl ? space.md : 0 }}>
          <Icon name="truck" size={18} />
          <Text weight="semibold" style={{ flex: 1 }}>{car || t('scheduled.yourCar')}</Text>
          {trip.car.plate && <Badge label={trip.car.plate} />}
        </View>
        {trip.notes ? <Text color={colors.ink3} style={{ marginTop: space.md }}>{trip.notes}</Text> : null}
      </Card>

      {['scheduled', 'in_progress'].includes(trip.status) && (
        <Button variant="danger" label={t('scheduled.cancelTrip')} onPress={cancel} loading={busy === 'cancel'} style={{ marginTop: space.xxl }} />
      )}

      {/* New departure time */}
      <Modal visible={moving !== null} transparent animationType="slide" onRequestClose={() => setMoving(null)}>
        <Pressable style={styles.overlay} onPress={() => setMoving(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text variant="title">{t('scheduled.changeTime')}</Text>
            <Text color={colors.ink3} style={{ marginTop: space.xs, marginBottom: space.lg }}>{t('scheduled.changeTimeText')}</Text>
            {moving && <DeparturePicker value={moving} onChange={setMoving} />}
            {moving && <Text align="center" weight="semibold" style={{ marginTop: space.md }}>{departureLabel(moving.toISOString(), locale, t)}</Text>}
            <Button label={t('common.save')} onPress={saveTime} style={{ marginTop: space.xl }} />
            <Button variant="ghost" label={t('common.cancel')} onPress={() => setMoving(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: space.xxl, marginBottom: space.md },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  call: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  map: { height: 200, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.soft2 },
  carPhoto: { width: '100%', height: 170, borderRadius: radius.lg, backgroundColor: colors.soft2 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.xxl, ...shadow.float },
});
