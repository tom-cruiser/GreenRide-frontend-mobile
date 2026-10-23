import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import FlowMap from '@/components/flow-map';
import { showError } from '@/components/friends-ui';
import { PersonAvatar } from '@/components/person-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, colors, formatKm, formatMoney, Header, Icon, radius, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';
import { photoSource } from '@/services/api';
import { pickupsOf, scheduledAPI, type ScheduledTrip } from '@/services/scheduled';
import { signalingClient } from '@/services/signalingClient';
import { departureLabel } from '@/utils/departure';

// One scheduled trip: the driver's path on the map with every stop, when it
// leaves, the driver and their car, the price of a seat. Riders choose how
// many seats and where they get on, and book (paid from the wallet when the
// trip ends; refunded if they cancel before it starts).

export default function ScheduledTripScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const { token, updateWalletBalance } = useAuth();
  const [trip, setTrip] = useState<ScheduledTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seats, setSeats] = useState(1);
  const [pickup, setPickup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const { trip: next } = await scheduledAPI.get(token, id);
      setTrip(next);
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

  if (!trip) {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        {error ? (
          <>
            <Icon name="slash" size={32} color={colors.muted} />
            <Text variant="title" align="center" style={{ marginTop: space.lg }}>{t('scheduled.unavailable')}</Text>
            <Text color={colors.ink3} align="center" style={{ marginTop: space.xs }}>{error}</Text>
            <Button label={t('common.back')} onPress={() => router.back()} style={{ marginTop: space.xl, alignSelf: 'stretch' }} />
          </>
        ) : (
          <ActivityIndicator size="large" color={colors.ink} />
        )}
      </Screen>
    );
  }

  const places = [trip.origin, ...trip.stops, trip.destination];
  const booking = trip.myBooking?.status === 'booked' ? trip.myBooking : null;
  const open = trip.status === 'scheduled' && new Date(trip.departureAt) > new Date();
  const boardAt = pickup ?? pickupsOf(trip)[0];
  const total = seats * trip.pricePerSeat;
  const car = [trip.car.color, trip.car.make, trip.car.model].filter(Boolean).join(' ');

  const book = () =>
    Alert.alert(
      t('scheduled.confirmTitle'),
      t('scheduled.confirmText', { count: seats, price: formatMoney(total, trip.currency), place: boardAt }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('scheduled.book'),
          onPress: async () => {
            if (!token) return;
            setBusy(true);
            try {
              setTrip((await scheduledAPI.book(token, trip.id, seats, boardAt)).trip);
              updateWalletBalance();
            } catch (e) {
              showError(router, t('scheduled.bookFailed'), e);
              load();
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );

  const cancel = () =>
    Alert.alert(t('scheduled.cancelTitle'), t('scheduled.cancelText'), [
      { text: t('scheduled.keep'), style: 'cancel' },
      {
        text: t('scheduled.cancelBooking'),
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          setBusy(true);
          try {
            setTrip((await scheduledAPI.cancelBooking(token, trip.id)).trip);
            updateWalletBalance();
          } catch (e) {
            showError(router, t('scheduled.cancelFailed'), e);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const statusLine = {
    scheduled: departureLabel(trip.departureAt, locale, t),
    in_progress: t('scheduled.onTheWay'),
    completed: t('scheduled.completed'),
    cancelled: t('scheduled.cancelled'),
  }[trip.status];

  return (
    <Screen>
      <Header title={t('scheduled.trip')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/scheduled'))} backLabel={t('common.back')} />

      {/* When and where */}
      <Card dark>
        <Text variant="overline" color={colors.onDarkMuted}>{statusLine}</Text>
        <Text variant="title" color={colors.onDark} style={{ marginTop: space.xs }}>{trip.origin.name} → {trip.destination.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          <Badge tone="light" icon="users" label={t(trip.seatsLeft > 1 ? 'scheduled.seatsLeftN' : 'scheduled.seatLeft', { count: trip.seatsLeft })} />
          {trip.distanceKm != null && <Badge tone="light" icon="navigation" label={formatKm(trip.distanceKm)} />}
          {trip.durationMin != null && <Badge tone="light" icon="clock" label={t('scheduled.duration', { min: trip.durationMin })} />}
        </View>
        <Text color={colors.onDark} weight="extrabold" style={{ fontSize: 32, lineHeight: 38, marginTop: space.lg }}>
          {formatMoney(trip.pricePerSeat, trip.currency)}
        </Text>
        <Text color={colors.onDarkMuted}>{t('scheduled.perSeatSet')}</Text>
      </Card>

      {/* The driver's path */}
      <View style={styles.map}>
        <FlowMap
          style={StyleSheet.absoluteFill}
          center={{ latitude: trip.origin.lat, longitude: trip.origin.lng }}
          controls={false}
          route={trip.geometry}
          fitTo={places.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
          pins={places.map((p, i) => ({
            id: `p${i}`, latitude: p.lat, longitude: p.lng, title: p.name,
            color: i === 0 || i === places.length - 1 ? colors.ink : colors.ink3,
          }))}
        />
      </View>
      <Card style={{ marginTop: space.md }}>
        <Text variant="heading">{t('scheduled.path')}</Text>
        {places.map((p, i) => (
          <View key={`${p.name}-${i}`} style={styles.stopRow}>
            <View style={styles.stopRail}>
              <View style={[styles.dot, (i === 0 || i === places.length - 1) && styles.dotEnd]} />
              {i < places.length - 1 && <View style={styles.rail} />}
            </View>
            <View style={{ flex: 1, paddingBottom: space.md }}>
              <Text weight={i === 0 || i === places.length - 1 ? 'semibold' : 'regular'}>{p.name}</Text>
              <Text variant="caption" color={colors.muted}>
                {i === 0 ? t('scheduled.start') : i === places.length - 1 ? t('scheduled.end') : t('scheduled.stopOnWay')}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Driver and car */}
      <Card style={{ marginTop: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <PersonAvatar person={trip.driver} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.muted}>{t('scheduled.driver')}</Text>
            <Text variant="heading" weight="bold">{trip.driver.firstName}</Text>
          </View>
          {trip.driver.rating != null && <Badge icon="star" label={trip.driver.rating.toFixed(1)} />}
        </View>
        {trip.car.photoUrl && token && (
          <Image source={photoSource(trip.car.photoUrl, token)} style={styles.carPhoto} contentFit="cover" accessibilityLabel={car} />
        )}
        <View style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="truck" size={18} />
          <Text weight="semibold" style={{ flex: 1 }}>{car || t('scheduled.car')}</Text>
          {trip.car.plate && <Badge label={trip.car.plate} />}
        </View>
        {trip.notes ? <Text color={colors.ink3} style={{ marginTop: space.md }}>{trip.notes}</Text> : null}
      </Card>

      {/* Your booking, or book */}
      {booking ? (
        <Card style={{ marginTop: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Icon name="check-circle" />
            <Text variant="heading" style={{ flex: 1 }}>{t('scheduled.booked')}</Text>
          </View>
          <Text color={colors.ink3} style={{ marginTop: space.sm }}>
            {t('scheduled.bookedText', { count: booking.seats, place: booking.pickup, price: formatMoney(booking.amount, trip.currency) })}
          </Text>
          {trip.status === 'scheduled' && (
            <Button variant="danger" label={t('scheduled.cancelBooking')} onPress={cancel} loading={busy} style={{ marginTop: space.lg }} />
          )}
        </Card>
      ) : open && trip.seatsLeft > 0 ? (
        <Card style={{ marginTop: space.md }}>
          <Text variant="heading">{t('scheduled.bookSeats')}</Text>
          <View style={styles.stepper}>
            <Text color={colors.ink3} style={{ flex: 1 }}>{t('scheduled.howMany')}</Text>
            <Pressable style={[styles.stepBtn, seats <= 1 && { opacity: 0.4 }]} disabled={seats <= 1}
              onPress={() => setSeats((v) => Math.max(1, v - 1))} accessibilityLabel={t('scheduled.fewer')}>
              <Icon name="minus" size={18} />
            </Pressable>
            <Text variant="heading" style={{ minWidth: 28, textAlign: 'center' }}>{seats}</Text>
            <Pressable style={[styles.stepBtn, seats >= trip.seatsLeft && { opacity: 0.4 }]} disabled={seats >= trip.seatsLeft}
              onPress={() => setSeats((v) => Math.min(trip.seatsLeft, v + 1))} accessibilityLabel={t('scheduled.more')}>
              <Icon name="plus" size={18} />
            </Pressable>
          </View>

          {pickupsOf(trip).length > 1 && (
            <>
              <Text color={colors.ink3} style={{ marginTop: space.lg }}>{t('scheduled.getOnAt')}</Text>
              <View style={styles.chips}>
                {pickupsOf(trip).map((name) => {
                  const on = name === boardAt;
                  return (
                    <Pressable key={name} onPress={() => setPickup(name)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                      style={[styles.chip, on && styles.chipOn]}>
                      <Text weight="semibold" color={on ? colors.onDark : colors.ink}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.totalRow}>
            <Text color={colors.ink3}>{t('scheduled.total')}</Text>
            <Text variant="heading" weight="bold">{formatMoney(total, trip.currency)}</Text>
          </View>
          <Text variant="caption" color={colors.muted}>{t('scheduled.held')}</Text>
          <Button label={t('scheduled.bookFor', { price: formatMoney(total, trip.currency) })} icon="check" onPress={book} loading={busy}
            style={{ marginTop: space.lg }} />
        </Card>
      ) : (
        <Card style={{ marginTop: space.md }}>
          <Text color={colors.ink3}>{trip.seatsLeft === 0 ? t('scheduled.full') : t('scheduled.closed')}</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: { height: 220, marginTop: space.md, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.soft2 },
  stopRow: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  stopRail: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink3, marginTop: 5 },
  dotEnd: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.ink, marginTop: 3 },
  rail: { flex: 1, width: 2, backgroundColor: colors.line, marginTop: 4 },
  carPhoto: { width: '100%', height: 180, borderRadius: radius.lg, marginTop: space.md, backgroundColor: colors.soft2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.lg },
});
