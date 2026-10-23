import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Badge, Button, Card, colors, Field, firstName, formatKm, formatMoney, Header, Icon, Row, Screen, space, Text } from '@/design';
import { useFocusEffect, useRouter } from 'expo-router';
import { CallRideButton } from '@/components/CallRideButton';
import { useAuth } from '@/contexts/AuthContext';
import { ridesAPI } from '@/services/api';
import FlowMap from '@/components/flow-map';
import { routing, type Route } from '@/services/geo';
import { signalingClient } from '@/services/signalingClient';
import { useT } from '@/i18n';

type T = ReturnType<typeof useT>['t'];

const POLL_MS = 4000;
// Re-route from the car at most this often, or when it moved this far.
const REROUTE_MS = 30_000;
const REROUTE_M = 200;

type Car = { lat: number; lng: number; heading: number | null; at: string };

// Metres between two points (equirectangular; fine at city scale).
const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const x = ((b.lng - a.lng) * Math.PI) / 180 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const y = ((b.lat - a.lat) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * 6371000;
};

type Ride = {
  id: number;
  status: 'gathering' | 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  pickup: string;
  dropoff: string;
  fare: number;
  distance: number;
  driver_name: string | null;
  is_shared: boolean;
  rating: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  // The assigned driver's last known position (then live over the socket).
  driver_location: { lat: number; lng: number; at: string } | null;
  share: null | {
    groupId: number;
    status: string;
    ridersCount: number;
    maxRiders: number;
    mode?: 'friends' | 'others';
    role?: 'host' | 'guest';
  };
};

const CANCELLABLE = ['gathering', 'pending', 'accepted', 'arrived'];

function headline(ride: Ride, t: T): { title: string; detail: string } {
  const driver = firstName(ride.driver_name) || t('ride.yourDriver');
  switch (ride.status) {
    case 'gathering':
      return { title: t('home.gathering'), detail: t('ride.gatheringText') };
    case 'pending':
      return { title: t('ride.finding'), detail: t('ride.findingText') };
    case 'accepted':
      return { title: t('ride.onTheWay', { name: driver }), detail: t('ride.heading', { place: ride.pickup }) };
    case 'arrived':
      return { title: t('ride.arrived', { name: driver }), detail: t('ride.meet', { place: ride.pickup }) };
    case 'in_progress':
      return { title: t('ride.onTrip'), detail: t('ride.heading', { place: ride.dropoff }) };
    case 'completed':
      return { title: t('ride.done'), detail: t('ride.paid', { price: formatMoney(ride.fare) }) };
    default:
      return { title: t('ride.cancelled'), detail: t('ride.refunded') };
  }
}

export default function ActiveRideScreen() {
  const router = useRouter();
  const { t } = useT();
  const { token, updateWalletBalance } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const lastRideId = useRef<number | null>(null);
  const [live, setLive] = useState<Car | null>(null);
  const [routed, setRouted] = useState<Route | null>(null);
  const routedFrom = useRef<{ lat: number; lng: number; time: number; to: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const { ride: active } = await ridesAPI.getActiveRide(token);
      if (active) {
        lastRideId.current = active.id;
        setRide(active);
      } else if (lastRideId.current) {
        // The ride just left the open states: show how it ended.
        const { ride: finished } = await ridesAPI.getRide(token, lastRideId.current);
        setRide(finished);
        lastRideId.current = null;
        updateWalletBalance();
      } else {
        setRide((current) => (current && ['completed', 'cancelled'].includes(current.status) ? current : null));
      }
    } catch (e) {
      console.warn('Active ride refresh failed:', e);
    } finally {
      setLoading(false);
    }
  }, [token, updateWalletBalance]);

  // Poll only while this screen is visible and the ride is still open.
  const isOpen = !ride || !['completed', 'cancelled'].includes(ride.status);
  useFocusEffect(
    useCallback(() => {
      refresh();
      if (!isOpen) return undefined;
      const timer = setInterval(refresh, POLL_MS);
      return () => clearInterval(timer);
    }, [refresh, isOpen]),
  );

  // The car: from the ride (last known), then live from the driver's phone.
  const rideId = ride?.id;
  const known = ride?.driver_location;
  const car: Car | null = live && (!known || live.at >= known.at)
    ? live
    : known ? { lat: known.lat, lng: known.lng, heading: live?.heading ?? null, at: known.at } : null;
  useEffect(() => {
    if (!rideId) return undefined;
    return signalingClient.on('ride:driver_location', (msg: any) => {
      if (msg?.rideId !== rideId) return;
      setLive({ lat: msg.lat, lng: msg.lng, heading: msg.heading ?? null, at: String(msg.at) });
    });
  }, [rideId]);

  // Road from the car to the pickup (then to the drop-off once on board).
  const target = ride && (ride.status === 'in_progress'
    ? (ride.dropoff_lat != null ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng! } : null)
    : (ride.pickup_lat != null ? { lat: ride.pickup_lat, lng: ride.pickup_lng! } : null));
  const status = ride?.status;
  const following = Boolean(car && target && ['accepted', 'in_progress'].includes(status ?? ''));
  const toGo = following ? routed : null;
  useEffect(() => {
    if (!token || !car || !target || !following) return;
    // A new destination (picked up: now to the drop-off) routes at once.
    const to = `${target.lat},${target.lng}`;
    const last = routedFrom.current;
    if (last && last.to === to && Date.now() - last.time < REROUTE_MS && metres(last, car) < REROUTE_M) return;
    routedFrom.current = { lat: car.lat, lng: car.lng, time: Date.now(), to };
    routing.route(token, car, target).then(setRouted).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, car?.lat, car?.lng, following, status, target?.lat, target?.lng]);

  const cancel = () => {
    if (!ride || !token) return;
    const hostOfGroup = ride.share?.mode === 'friends' && ride.share.role === 'host';
    Alert.alert(t('ride.cancelTitle'), hostOfGroup ? t('ride.cancelGroup') : t('ride.cancelText'), [
      { text: t('ride.keep'), style: 'cancel' },
      {
        text: t('ride.cancel'),
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const { ride: cancelled } = await ridesAPI.cancelRide(token, String(ride.id));
            lastRideId.current = null;
            setRide({ ...ride, ...cancelled });
            updateWalletBalance();
          } catch (e) {
            Alert.alert(t('ride.cancelFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const submitRating = async () => {
    if (!ride || !token || rating === 0) return;
    setSubmittingRating(true);
    try {
      await ridesAPI.rateRide(token, String(ride.id), rating, feedback.trim() || undefined);
      Alert.alert(t('history.thanks'), t('ride.ratingSent'), [
        { text: t('common.ok'), onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      Alert.alert(t('history.rateFailedTitle'), e instanceof Error ? e.message : t('common.tryAgain'));
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        <ActivityIndicator size="large" color={colors.ink} />
      </Screen>
    );
  }

  if (!ride) {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        <Icon name="map-pin" size={36} color={colors.muted} />
        <Text variant="title" align="center" style={{ marginTop: space.lg }}>{t('ride.none')}</Text>
        <Text color={colors.ink3} align="center" style={{ marginTop: space.xs }}>{t('ride.noneText')}</Text>
        <Button label={t('book.title')} icon="map-pin" onPress={() => router.replace('/(tabs)/ride-booking')} style={{ marginTop: space.xl, alignSelf: 'stretch' }} />
      </Screen>
    );
  }

  const { title, detail } = headline(ride, t);
  const hasDriver = ['accepted', 'arrived', 'in_progress'].includes(ride.status);
  const waiting = ride.status === 'pending' || ride.status === 'gathering';

  return (
    <Screen>
      <Header onBack={() => router.replace('/(tabs)')} backLabel={t('tabs.home')} />

      {/* Status in plain words */}
      <Card dark style={{ alignItems: 'flex-start' }}>
        {waiting ? <ActivityIndicator color={colors.onDark} style={{ marginBottom: space.md }} /> : null}
        <Text variant="title" color={colors.onDark}>{title}</Text>
        <Text color={colors.onDarkMuted} style={{ marginTop: space.xs }}>{detail}</Text>
      </Card>

      {/* Map: the car coming, then the trip */}
      {ride.pickup_lat != null && !['completed', 'cancelled'].includes(ride.status) && (
        <View style={styles.map}>
          <FlowMap
            style={StyleSheet.absoluteFill}
            center={car && hasDriver ? { latitude: car.lat, longitude: car.lng } : { latitude: ride.pickup_lat, longitude: ride.pickup_lng! }}
            delta={0.02}
            controls={false}
            route={toGo?.geometry}
            fitTo={car && target ? [{ latitude: car.lat, longitude: car.lng }, { latitude: target.lat, longitude: target.lng }] : null}
            pins={[
              { id: 'pickup', latitude: ride.pickup_lat, longitude: ride.pickup_lng!, title: t('book.pickup'), color: colors.ink },
              ...(ride.dropoff_lat != null && ride.status === 'in_progress'
                ? [{ id: 'dropoff', latitude: ride.dropoff_lat, longitude: ride.dropoff_lng!, title: t('book.dropoff'), color: colors.ink }] : []),
              ...(car && hasDriver
                ? [{ id: 'car', latitude: car.lat, longitude: car.lng, title: firstName(ride.driver_name) || t('ride.driver'), kind: 'car' as const, heading: car.heading, animate: true }] : []),
            ]}
          />
          {toGo && (
            <View style={styles.eta}>
              <Text variant="caption" weight="semibold" color={colors.onDark}>
                {ride.status === 'in_progress' ? t('ride.minToGo', { min: toGo.durationMin }) : t('ride.minAway', { min: toGo.durationMin, distance: formatKm(toGo.distanceKm) })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Driver */}
      {ride.driver_name && (
        <Card style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Avatar name={ride.driver_name} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.muted}>{t('ride.yourDriver')}</Text>
            <Text variant="heading" weight="bold">{firstName(ride.driver_name)}</Text>
          </View>
        </Card>
      )}
      {hasDriver && <View style={{ marginTop: space.md }}><CallRideButton rideId={ride.id} label={t('ride.callDriver')} /></View>}

      {/* Trip */}
      <Card style={{ marginTop: space.md }}>
        <Row label={t('book.from')} value={ride.pickup} />
        <Row label={t('book.to')} value={ride.dropoff} />
        <Row label={t('ride.distance')} value={`~${formatKm(Number(ride.distance))}`} />
        <Row label={t('ride.fare')} value={formatMoney(ride.fare)} strong />
      </Card>

      {ride.share?.mode === 'friends' && ride.status !== 'cancelled' && (
        <Card style={{ marginTop: space.md }} onPress={() => router.push(`/friends-ride/${ride.share!.groupId}`)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name="users" />
            <View style={{ flex: 1 }}>
              <Text weight="semibold">{t('ride.withFriends')}</Text>
              <Text variant="caption" color={colors.muted}>{t('ride.groupText', { count: ride.share.ridersCount, max: ride.share.maxRiders })}</Text>
            </View>
            <Icon name="chevron-right" color={colors.muted} />
          </View>
        </Card>
      )}

      {ride.is_shared && ride.share && ride.share.mode !== 'friends' && ride.status === 'pending' && (
        <Card style={{ marginTop: space.md }} onPress={() => router.push({ pathname: '/shared-ride', params: { groupId: String(ride.share!.groupId) } })}>
          <Text weight="semibold">{t('book.shared')}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
            <Badge label={t('ride.ridersOf', { count: ride.share.ridersCount, max: ride.share.maxRiders })} icon="users" />
            <Badge label={ride.share.status === 'confirmed' ? t('sharedRide.confirmed') : t('sharedRide.matching')} />
          </View>
        </Card>
      )}

      {/* Rating once the trip is done */}
      {ride.status === 'completed' && ride.rating === null && (
        <Card style={{ marginTop: space.md }}>
          <Text variant="heading">{t('ride.howWas')}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} accessibilityRole="button" accessibilityLabel={t('ride.stars', { count: star })} hitSlop={6}>
                <Text style={{ fontSize: 36, lineHeight: 42 }} color={star <= rating ? colors.ink : colors.line}>★</Text>
              </Pressable>
            ))}
          </View>
          <Field label={t('ride.addNote')} value={feedback} onChangeText={setFeedback} multiline
            style={{ height: 90, paddingTop: space.md, textAlignVertical: 'top' }} />
          <Button label={submittingRating ? t('ride.sending') : t('ride.sendRating')} onPress={submitRating}
            disabled={rating === 0} loading={submittingRating} style={{ marginTop: space.md }} />
        </Card>
      )}

      {CANCELLABLE.includes(ride.status) && (
        <Button label={t('ride.cancel')} variant="danger" onPress={cancel} loading={cancelling} style={{ marginTop: space.xl }} />
      )}
      {['completed', 'cancelled'].includes(ride.status) && (
        <Button label={t('common.done')} variant="secondary" onPress={() => router.replace('/(tabs)')} style={{ marginTop: space.xl }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  map: { height: 240, borderRadius: 24, overflow: 'hidden', marginTop: space.md, backgroundColor: colors.soft2 },
  eta: { position: 'absolute', left: space.md, top: space.md, backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: 6 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.md, marginVertical: space.md },
});
