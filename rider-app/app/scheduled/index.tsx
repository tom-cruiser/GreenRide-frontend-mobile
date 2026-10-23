import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PersonAvatar } from '@/components/person-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, colors, formatKm, formatMoney, Icon, IconButton, radius, shadow, space, Text } from '@/design';
import { useT } from '@/i18n';
import { photoSource } from '@/services/api';
import { scheduledAPI, type ScheduledTrip } from '@/services/scheduled';
import { signalingClient } from '@/services/signalingClient';
import { departureLabel } from '@/utils/departure';

// Scheduled trips, in the same style as "Join a ride": the rider's own
// bookings first, then trips drivers have posted near them as big cards
// (the car's photo, when, where to, the price of a seat).

export default function ScheduledScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { token } = useAuth();
  const [trips, setTrips] = useState<ScheduledTrip[] | null>(null);
  const [booked, setBooked] = useState<ScheduledTrip[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const pos = await Location.getForegroundPermissionsAsync()
      .then((p) => (p.status === 'granted' ? Location.getLastKnownPositionAsync() : null))
      .catch(() => null);
    const [list, mine] = await Promise.all([
      scheduledAPI.list(token, pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : undefined).catch(() => null),
      scheduledAPI.myBookings(token).catch(() => null),
    ]);
    setTrips(list?.trips ?? []);
    // Live bookings only: what is coming up or under way.
    setBooked((mine?.trips ?? []).filter((x) => x.myBooking?.status === 'booked' && ['scheduled', 'in_progress'].includes(x.status)));
  }, [token]);

  useFocusEffect(useCallback(() => {
    load();
    const off = signalingClient.on('scheduled:updated', () => load());
    const timer = setInterval(load, 30_000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = (trip: ScheduledTrip) => router.push(`/scheduled/${trip.id}`);
  const others = (trips ?? []).filter((x) => x.myBooking?.status !== 'booked');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <Text variant="title" style={{ flex: 1 }}>{t('scheduled.title')}</Text>
      </View>
      <Text color={colors.ink3} style={{ marginTop: space.sm }}>{t('scheduled.intro')}</Text>

      {booked.length > 0 && (
        <>
          <View style={styles.sectionHead}>
            <Text variant="heading">{t('scheduled.yourBookings')}</Text>
          </View>
          <View style={{ gap: space.sm }}>
            {booked.map((trip) => (
              <Pressable key={trip.id} onPress={() => open(trip)} style={({ pressed }) => [styles.bookedRow, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                <View style={styles.bookedIcon}><Icon name="calendar" size={18} color={colors.onDark} /></View>
                <View style={{ flex: 1 }}>
                  <Text weight="semibold" numberOfLines={1}>{trip.origin.name} → {trip.destination.name}</Text>
                  <Text variant="caption" color={colors.muted} numberOfLines={1}>
                    {departureLabel(trip.departureAt, locale, t)} · {t(trip.myBooking!.seats > 1 ? 'scheduled.seatsN' : 'scheduled.seat1', { count: trip.myBooking!.seats })}
                  </Text>
                </View>
                {trip.status === 'in_progress' && <Badge label={t('scheduled.onTheWay')} tone="dark" />}
                <Icon name="chevron-right" color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      <View style={styles.sectionHead}>
        <Text variant="heading">{t('scheduled.upcoming')}</Text>
        <Text variant="caption" color={colors.muted}>{t('scheduled.near')}</Text>
      </View>
      {trips && others.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="calendar" size={22} />
          <Text weight="semibold" style={{ marginTop: space.sm }}>{t('scheduled.none')}</Text>
          <Text variant="caption" color={colors.muted} align="center">{t('scheduled.noneText')}</Text>
          <Button size="md" variant="secondary" label={t('scheduled.joinInstead')} icon="users" onPress={() => router.push('/join')}
            style={{ marginTop: space.md, alignSelf: 'stretch' }} />
        </View>
      ) : (
        <View style={styles.grid}>
          {others.map((trip) => <TripCard key={trip.id} trip={trip} onOpen={() => open(trip)} />)}
        </View>
      )}
    </ScrollView>
  );
}

// A trip as a card, half the width: the car (or the driver), when, the route and a seat's price.
function TripCard({ trip, onOpen }: { trip: ScheduledTrip; onOpen: () => void }) {
  const { t, locale } = useT();
  const { token } = useAuth();
  const car = [trip.car.make, trip.car.model].filter(Boolean).join(' ');
  return (
    <Pressable onPress={onOpen} style={styles.card} accessibilityRole="button">
      <View style={StyleSheet.absoluteFill}>
        {trip.car.photoUrl && token ? (
          <Image source={photoSource(trip.car.photoUrl, token)} style={{ flex: 1 }} contentFit="cover" />
        ) : trip.driver.photoUrl ? (
          <PersonAvatar person={trip.driver} fill />
        ) : (
          <View style={styles.cardIcon}><Icon name="truck" size={64} color="rgba(255,255,255,0.14)" /></View>
        )}
      </View>
      <View style={styles.cardShade} />
      <View style={styles.cardTop}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          <Badge tone="light" icon="clock" label={departureLabel(trip.departureAt, locale, t)} />
          <Badge tone="light" icon="users" label={t(trip.seatsLeft > 1 ? 'scheduled.seatsLeftN' : 'scheduled.seatLeft', { count: trip.seatsLeft })} />
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text variant="heading" weight="bold" color={colors.onDark} numberOfLines={2}>{trip.destination.name}</Text>
        <Text variant="caption" color={colors.onDarkMuted} numberOfLines={1}>{t('scheduled.from', { place: trip.origin.name })}</Text>
        {trip.stops.length > 0 && (
          <Text variant="caption" color={colors.onDarkMuted} numberOfLines={1}>{t(trip.stops.length > 1 ? 'scheduled.stopsN' : 'scheduled.stop1', { count: trip.stops.length })}</Text>
        )}
        {trip.distanceFromYouKm != null && (
          <Text variant="caption" color={colors.onDarkMuted} numberOfLines={1}>{t('scheduled.passesNear', { distance: formatKm(trip.distanceFromYouKm) })}</Text>
        )}
        <Text variant="caption" weight="semibold" color={colors.onDark} numberOfLines={1} style={{ marginTop: space.sm }}>
          {trip.driver.firstName}{car ? ` · ${car}` : ''}
        </Text>
        <Text variant="heading" weight="bold" color={colors.onDark}>{formatMoney(trip.pricePerSeat, trip.currency)}</Text>
        <Text variant="caption" color={colors.onDarkMuted}>{t('scheduled.perSeat')}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, paddingTop: 56, paddingBottom: space.xxxl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  bookedRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  bookedIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  card: { width: '48.5%', height: 300, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.night, ...shadow.float },
  cardIcon: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.night2 },
  cardShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  cardTop: { position: 'absolute', top: space.md, left: space.md, right: space.md },
  cardBottom: { position: 'absolute', left: space.md, right: space.md, bottom: space.md },
  empty: { alignItems: 'center', padding: space.xl, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 4 },
});
