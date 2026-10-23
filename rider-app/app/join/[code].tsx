import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '@/design';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { friendsAPI, type CodeLookup } from '@/services/api';
import { Avatar, BackButton, ACCENT, Row, money, showError, ui } from '@/components/friends-ui';
import { useT } from '@/i18n';

// A ride found by its code (typed in, or opened from riderapp://join/<code>).
export default function JoinByCodeScreen() {
  const router = useRouter();
  const { t } = useT();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { token, updateWalletBalance } = useAuth();
  const [ride, setRide] = useState<CodeLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !code) return;
    friendsAPI.lookupCode(token, code)
      .then(({ ride: found }) => setRide(found))
      .catch((e) => setError(e instanceof Error ? e.message : t('join.noRide')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, code]);

  const join = async () => {
    if (!token || !code) return;
    setBusy(true);
    try {
      const { group } = await friendsAPI.joinByCode(token, code);
      updateWalletBalance();
      router.replace(`/friends-ride/${group.groupId}`);
    } catch (e) {
      showError(router, t('join.failed'), e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={ui.page} contentContainerStyle={ui.container}>
      <BackButton onPress={() => router.replace('/join')} label={t('common.back')} />
      {!ride ? (
        <View style={ui.statusCard}>
          {error ? (
            <>
              <Text style={ui.title}>{error}</Text>
              <Text style={ui.detail}>{t('join.checkCode')}</Text>
            </>
          ) : (
            <ActivityIndicator size="large" color={ACCENT} />
          )}
        </View>
      ) : (
        <>
          <View style={ui.statusCard}>
            <Avatar person={ride.host} size={64} />
            <Text style={[ui.title, { marginTop: 10 }]}>{t('join.rideWith', { name: ride.host.firstName })}</Text>
            <Text style={ui.price}>{money(ride.price, ride.currency)}</Text>
            <Text style={ui.hint}>{t('join.priceNow')}</Text>
          </View>
          <View style={ui.card}>
            <Row label={t('book.pickup')} value={ride.pickup} />
            <Row label={t('book.dropoff')} value={ride.dropoff} />
            <Row label={t('join.seatsLeft')} value={String(ride.seatsLeft)} />
          </View>
          {ride.isHost || ride.alreadyJoined ? (
            <TouchableOpacity style={ui.primaryBtn} onPress={() => router.replace(`/friends-ride/${ride.groupId}`)}>
              <Text style={ui.primaryBtnText}>{t('invite.open')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[ui.primaryBtn, (busy || ride.seatsLeft < 1) && ui.disabled]} onPress={join} disabled={busy || ride.seatsLeft < 1}>
              <Text style={ui.primaryBtnText}>{ride.seatsLeft < 1 ? t('join.full') : busy ? t('join.joining') : t('join.join')}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}
