import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, colors, Divider, EmptyState, formatMoney, Header, Screen, space, Stat, Text } from '@/design';
import { useT } from '@/i18n';
import { driversAPI, walletAPI } from '@/services/api';

type Stats = {
  earnings: { today: number; week: number; month: number };
  trips: { today: number; week: number; month: number };
  rating: { average: number | null; count: number };
  acceptanceRate: number | null;
  payoutPercent: number;
  minWithdrawal: number;
  todayTrips: { id: number; pickup: string; dropoff: string; earned: number; completed_at: string; riders_count?: number }[];
};

// Earnings: today, the week and the month; the key numbers (rides, acceptance,
// rating); and the wallet with a withdrawal to mobile money.
export default function EarningsScreen() {
  const router = useRouter();
  const { t } = useT();
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [s, w] = await Promise.all([
      driversAPI.getStats(token).catch(() => null),
      walletAPI.getBalance(token).catch(() => null),
    ]);
    if (s) setStats(s);
    if (w?.wallet) setAvailable(w.wallet.available);
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Header title={t('earnings.title')} />

      {/* Today, big; the week and month beside it */}
      <Card dark>
        <Text color={colors.onDarkMuted}>{t('earnings.today')}</Text>
        <Text color={colors.onDark} weight="extrabold" style={{ fontSize: 44, lineHeight: 50, letterSpacing: -1.2 }}>
          {formatMoney(stats?.earnings.today ?? 0)}
        </Text>
        <Divider dark />
        <View style={{ flexDirection: 'row', gap: space.lg }}>
          <Stat dark label={t('earnings.week')} value={formatMoney(stats?.earnings.week ?? 0)} />
          <Stat dark label={t('earnings.month')} value={formatMoney(stats?.earnings.month ?? 0)} />
        </View>
      </Card>

      {/* Key numbers */}
      <Card style={{ marginTop: space.md, flexDirection: 'row', gap: space.md }}>
        <Stat label={t('earnings.trips')} value={String(stats?.trips.today ?? 0)} />
        <Stat label={t('earnings.acceptance')} value={stats?.acceptanceRate == null ? '—' : `${stats.acceptanceRate} %`} />
        <Stat label={t('earnings.rating')} value={stats?.rating.average ? `${stats.rating.average.toFixed(1)} ★` : '—'} />
      </Card>
      {stats && <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm, marginLeft: space.xs }}>{t('earnings.keep', { p: stats.payoutPercent })}</Text>}

      {/* Wallet */}
      <Card style={{ marginTop: space.xl }}>
        <Text variant="overline" color={colors.muted}>{t('earnings.wallet')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.sm }}>
          <View>
            <Text color={colors.ink3}>{t('earnings.available')}</Text>
            <Text variant="title">{available == null ? '—' : formatMoney(available)}</Text>
          </View>
        </View>
        <Button label={t('earnings.withdraw')} icon="arrow-up-right" onPress={() => router.push('/withdraw')} style={{ marginTop: space.lg }}
          disabled={!stats || (available ?? 0) < (stats?.minWithdrawal ?? 0)} />
      </Card>

      {/* Today's rides */}
      <Text variant="heading" style={{ marginTop: space.xxl, marginBottom: space.md }}>{t('earnings.todayTrips')}</Text>
      {(stats?.todayTrips.length ?? 0) === 0 ? (
        <Card><EmptyState icon="sun" title={t('earnings.noTripsToday')} /></Card>
      ) : (
        <Card>
          {stats!.todayTrips.map((trip, i) => (
            <View key={trip.id}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Text weight="semibold" numberOfLines={1}>{trip.pickup} → {trip.dropoff}</Text>
                  <Text variant="caption" color={colors.muted}>
                    {new Date(trip.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {(trip.riders_count ?? 1) > 1 ? ` · ${t('rides.group', { n: trip.riders_count ?? 1 })}` : ''}
                  </Text>
                </View>
                <Text weight="bold">+{formatMoney(trip.earned)}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
