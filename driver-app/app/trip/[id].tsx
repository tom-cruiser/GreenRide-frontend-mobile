import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, Badge, Card, colors, firstName, formatDateTime, formatKm, formatMoney, Header, Row, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';
import { ridesAPI } from '@/services/api';

type Ride = {
  id: number;
  status: string;
  pickup: string;
  dropoff: string;
  fare: number;
  distance: number;
  rider_name: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  rating: number | null;
  share?: null | { mode?: 'friends' | 'others'; ridersCount?: number; groupFare?: number };
};

// One past ride. The rider is shown by first name and initials only.
export default function TripScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    ridesAPI.getRide(token, id).then((r) => setRide(r.ride)).catch((e) => setError(e instanceof Error ? e.message : t('common.error')));
  }, [token, id, t]);

  const group = ride?.share?.mode === 'friends' && (ride.share.ridersCount ?? 1) > 1 ? ride.share.ridersCount ?? 1 : 0;

  return (
    <Screen>
      <Header title={t('trip.title')} onBack={() => router.back()} backLabel={t('common.back')} />
      {!ride ? (
        error ? <Text color={colors.danger}>{error}</Text> : <ActivityIndicator color={colors.ink} />
      ) : (
        <View style={{ gap: space.md }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Avatar name={ride.rider_name} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="heading" weight="bold">{firstName(ride.rider_name)}{group ? ` ${t('ride.groupOf', { n: group - 1 })}` : ''}</Text>
              <Badge label={t(`status.${ride.status as 'completed'}`)} tone={ride.status === 'cancelled' ? 'danger' : 'neutral'} />
            </View>
            <Text variant="title">{formatMoney(group ? ride.share?.groupFare ?? ride.fare : ride.fare)}</Text>
          </Card>
          <Card>
            <Row label={t('request.pickup')} value={ride.pickup} />
            <Row label={t('request.dropoff')} value={ride.dropoff} />
            <Row label={t('request.distance')} value={formatKm(ride.distance)} />
            <Row label={t('trip.date')} value={formatDateTime(ride.created_at, locale)} />
            {ride.started_at && <Row label={t('trip.started')} value={formatDateTime(ride.started_at, locale)} />}
            {ride.completed_at && <Row label={t('trip.ended')} value={formatDateTime(ride.completed_at, locale)} />}
            {ride.rating != null && <Row label={t('trip.rating')} value={`${ride.rating} ★`} />}
          </Card>
        </View>
      )}
    </Screen>
  );
}
