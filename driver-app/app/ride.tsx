import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { CallRideButton } from '@/components/CallRideButton';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverWork, type ActiveRide } from '@/contexts/DriverWorkContext';
import { Avatar, Button, Card, colors, firstName, formatKm, formatMoney, Icon, Row, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';
import { ridesAPI } from '@/services/api';

// The ride, step by step, taking over the whole screen (no tabs):
// going to pickup → at pickup → on the trip → finished.
type Finished = { earned: number; paid: number; riders: number };

const STEP = {
  accepted: { action: 'arrive', title: 'ride.toPickup', next: 'ride.toPickupNext', button: 'ride.iArrived', icon: 'flag' },
  arrived: { action: 'start', title: 'ride.arrived', next: 'ride.arrivedNext', button: 'ride.start', icon: 'play' },
  in_progress: { action: 'complete', title: 'ride.inProgress', next: 'ride.inProgressNext', button: 'ride.end', icon: 'check-circle' },
} as const;

function openDirections(ride: ActiveRide, onError: () => void) {
  const toPickup = ride.status !== 'in_progress';
  const destination = toPickup && ride.pickup_lat != null && ride.pickup_lng != null
    ? `${ride.pickup_lat},${ride.pickup_lng}`
    : toPickup ? ride.pickup : ride.dropoff;
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`).catch(onError);
}

export default function RideScreen() {
  const router = useRouter();
  const { t } = useT();
  const { token, updateWalletBalance } = useAuth();
  const { activeRide, refreshActive } = useDriverWork();
  const [acting, setActing] = useState(false);
  const [finished, setFinished] = useState<Finished | null>(null);
  const hadRide = useRef(false);

  // The ride vanished without the driver ending it: the rider cancelled.
  useEffect(() => {
    if (activeRide) {
      hadRide.current = true;
      return;
    }
    if (hadRide.current && !finished && !acting) {
      hadRide.current = false;
      Alert.alert(t('ride.riderCancelled'));
      router.replace('/(tabs)');
    }
  }, [activeRide, finished, acting, router, t]);

  const home = () => {
    setFinished(null);
    router.replace('/(tabs)');
  };

  if (finished) {
    return (
      <Screen dark edges={['top', 'bottom']} contentStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={styles.doneIcon}><Icon name="check" size={40} color={colors.ink} /></View>
          <Text variant="title" color={colors.onDark} style={{ marginTop: space.xl }}>{t('ride.finished')}</Text>
          <Text color={colors.onDarkMuted} style={{ marginTop: space.xxl }}>{t('ride.earned')}</Text>
          <Text color={colors.onDark} weight="extrabold" style={{ fontSize: 52, lineHeight: 58, letterSpacing: -1.5 }}>
            {formatMoney(finished.earned)}
          </Text>
          <Text color={colors.onDarkMuted} align="center" style={{ marginTop: space.sm }}>
            {finished.riders > 1
              ? t('ride.paidGroup', { n: finished.riders, amount: formatMoney(finished.paid) })
              : t('ride.paid', { amount: formatMoney(finished.paid) })}
          </Text>
        </View>
        <Button size="xl" variant="light" label={t('ride.backHome')} onPress={home} />
      </Screen>
    );
  }

  if (!activeRide) return <Screen scroll={false}>{null}</Screen>;

  const ride = activeRide;
  const step = STEP[ride.status as keyof typeof STEP];
  const group = ride.share?.mode === 'friends' && (ride.share.ridersCount ?? 1) > 1 ? ride.share.ridersCount ?? 1 : 0;
  const name = firstName(ride.rider_name) || t('trip.rider');
  const paid = group ? ride.share?.groupFare ?? ride.fare : ride.fare;

  const advance = async () => {
    if (!token || !step) return;
    setActing(true);
    try {
      if (step.action === 'complete') {
        const result = await ridesAPI.completeRide(token, ride.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setFinished({ earned: result.driverAmount ?? 0, paid, riders: group || 1 });
        updateWalletBalance();
        await refreshActive();
      } else {
        await (step.action === 'arrive' ? ridesAPI.arriveRide(token, ride.id) : ridesAPI.startRide(token, ride.id));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        await refreshActive();
      }
    } catch (e) {
      Alert.alert(t('ride.actionError'), e instanceof Error ? e.message : t('common.error'));
      refreshActive();
    } finally {
      setActing(false);
    }
  };

  const cancel = () =>
    Alert.alert(t('ride.cancelTitle'), t('ride.cancelText'), [
      { text: t('ride.keep'), style: 'cancel' },
      {
        text: t('ride.cancel'), style: 'destructive',
        onPress: async () => {
          if (!token) return;
          setActing(true);
          try {
            await ridesAPI.cancelRide(token, ride.id);
            hadRide.current = false;
            await refreshActive();
            router.replace('/(tabs)');
          } catch (e) {
            Alert.alert(t('ride.actionError'), e instanceof Error ? e.message : t('common.error'));
          } finally {
            setActing(false);
          }
        },
      },
    ]);

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ flexGrow: 1 }}>
      {/* Status in plain words, and what to do next */}
      {step && (
        <View style={{ marginBottom: space.xl }}>
          <Text variant="overline" color={colors.muted}>{t(step.title)}</Text>
          <Text variant="display" style={{ marginTop: space.xs }}>
            {t(step.next, { name, place: ride.status === 'in_progress' ? ride.dropoff : ride.pickup })}
          </Text>
        </View>
      )}

      {/* Rider */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <Avatar name={ride.rider_name} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="heading" weight="bold">{name}{group ? ` ${t('ride.groupOf', { n: group - 1 })}` : ''}</Text>
          {group ? <Text color={colors.ink3}>{t('ride.pickupAll', { n: group })}</Text> : null}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.md }}>
        <CallRideButton rideId={ride.id} label={t('ride.call')} style={{ flex: 1 }} />
        <Button label={t('ride.directions')} icon="navigation" variant="secondary" style={{ flex: 1 }}
          onPress={() => openDirections(ride, () => Alert.alert(t('ride.mapsError')))} />
      </View>

      {/* Trip */}
      <Card style={{ marginTop: space.md }}>
        <Row label={t('request.pickup')} value={ride.pickup} />
        <Row label={t('request.dropoff')} value={ride.dropoff} />
        <Row label={t('request.distance')} value={formatKm(ride.distance)} />
        <Row label={group ? t('ride.groupFare') : t('ride.fare')} value={formatMoney(paid)} strong />
      </Card>

      <View style={{ flex: 1, minHeight: space.xxl }} />
      {step && (
        <Button size="xl" label={t(step.button)} icon={step.icon} onPress={advance} loading={acting} />
      )}
      {(ride.status === 'accepted' || ride.status === 'arrived') && (
        <Button label={t('ride.cancel')} variant="danger" onPress={cancel} disabled={acting}
          style={{ marginTop: space.sm }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  doneIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.onDark, alignItems: 'center', justifyContent: 'center' },
});
