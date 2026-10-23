import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, colors, EmptyState, formatMoney, Header, Icon, space, Text } from '@/design';
import { useT } from '@/i18n';
import { scheduledAPI, type ScheduledTrip } from '@/services/scheduled';
import { signalingClient } from '@/services/signalingClient';
import { departureLabel } from '@/utils/departure';

// The scheduled trips this driver hosts, coming ones first, and the button
// to post a new one.
export default function HostedTripsScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { token } = useAuth();
  const [trips, setTrips] = useState<ScheduledTrip[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setTrips((await scheduledAPI.mine(token)).trips);
    } catch {
      setTrips((list) => list ?? []);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    load();
    return signalingClient.on('scheduled:updated', () => load());
  }, [load]));

  const tone = (s: ScheduledTrip['status']) => (s === 'cancelled' ? 'danger' : s === 'completed' ? 'neutral' : 'dark') as 'danger' | 'neutral' | 'dark';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={trips ?? []}
        keyExtractor={(trip) => String(trip.id)}
        contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxxl * 2, gap: space.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            <Header title={t('scheduled.title')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} backLabel={t('common.back')} />
            <Text color={colors.ink3}>{t('scheduled.intro')}</Text>
            <Button size="xl" icon="plus" label={t('scheduled.newTitle')} onPress={() => router.push('/scheduled/new')} />
          </View>
        }
        ListEmptyComponent={trips ? <EmptyState icon="calendar" title={t('scheduled.none')} text={t('scheduled.noneText')} /> : null}
        renderItem={({ item }) => {
          const booked = item.seatsTotal - item.seatsLeft;
          return (
            <Card onPress={() => router.push(`/scheduled/${item.id}`)} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
                <Text variant="caption" color={colors.muted}>{departureLabel(item.departureAt, locale, t)}</Text>
                <Badge label={t(`scheduled.status.${item.status}`)} tone={tone(item.status)} />
              </View>
              <Text weight="semibold" numberOfLines={2}>{item.origin.name} → {item.destination.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Badge icon="users" label={t('scheduled.seatsBooked', { count: booked, total: item.seatsTotal })} />
                <Text variant="caption" color={colors.muted}>{t('scheduled.perSeatPrice', { price: formatMoney(item.pricePerSeat, item.currency) })}</Text>
                <View style={{ flex: 1 }} />
                <Icon name="chevron-right" color={colors.muted} />
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}
