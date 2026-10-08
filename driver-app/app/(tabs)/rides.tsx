import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Card, colors, EmptyState, formatDateTime, formatMoney, Header, Icon, space, Text } from '@/design';
import { useT } from '@/i18n';
import { ridesAPI } from '@/services/api';

export type HistoryRide = {
  id: string;
  pickup: string;
  dropoff: string;
  fare: number;
  status: string;
  date: string;
  share?: null | { mode?: 'friends' | 'others'; ridersCount?: number; groupFare?: number };
};

// Past rides, newest first. A friends group is one ride with its total.
export default function RidesScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { token } = useAuth();
  const [rides, setRides] = useState<HistoryRide[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { rides: list } = await ridesAPI.getRideHistory(token);
      setRides(list ?? []);
    } catch {
      setRides((r) => r ?? []);
    }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={rides ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxxl * 2, gap: space.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={<Header title={t('rides.title')} />}
        ListEmptyComponent={rides ? <EmptyState icon="clock" title={t('rides.none')} text={t('rides.noneHint')} /> : null}
        renderItem={({ item }) => {
          const group = item.share?.mode === 'friends' && (item.share.ridersCount ?? 1) > 1;
          const fare = group ? item.share?.groupFare ?? item.fare : item.fare;
          return (
            <Card onPress={() => router.push(`/trip/${item.id}`)} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
                <Text variant="caption" color={colors.muted}>{formatDateTime(item.date, locale)}</Text>
                <Text variant="heading" weight="bold">{formatMoney(fare)}</Text>
              </View>
              <Text weight="semibold" numberOfLines={2}>{item.pickup} → {item.dropoff}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Badge label={t(`status.${item.status as 'completed'}`)} tone={item.status === 'cancelled' ? 'danger' : item.status === 'completed' ? 'neutral' : 'dark'} />
                {group && <Badge label={t('rides.group', { n: item.share?.ridersCount ?? 1 })} icon="users" />}
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
