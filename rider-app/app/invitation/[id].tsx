import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '@/design';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { friendsAPI, type FriendsGroup } from '@/services/api';
import { Avatar, BackButton, ACCENT, Row, money, showError, ui, useCountdown, useLiveGroup } from '@/components/friends-ui';
import { useT } from '@/i18n';

// Opened from an invitation notification: who invited, the ride, the price, Accept / Decline.
export default function InvitationScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, updateWalletBalance } = useAuth();
  const [group, setGroup] = useState<FriendsGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!token || !id) return;
    try {
      setGroup((await friendsAPI.getInvitation(token, id)).group);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('invite.loadFailed'));
    }
  }, [token, id, t]);
  useLiveGroup(group?.groupId, reload);
  const countdown = useCountdown(group?.invitation?.status === 'invited' ? group.expiresAt : null);

  if (!group) {
    return (
      <View style={[ui.page, ui.center]}>
        {error ? <Text style={ui.detail}>{error}</Text> : <ActivityIndicator size="large" color={ACCENT} />}
      </View>
    );
  }

  const open = group.invitation?.status === 'invited' && group.status === 'gathering' && !group.expired;
  const answer = async (accept: boolean) => {
    if (!token) return;
    setBusy(true);
    try {
      if (accept) {
        const { group: joined } = await friendsAPI.accept(token, id!);
        updateWalletBalance();
        router.replace(`/friends-ride/${joined.groupId}`);
      } else {
        await friendsAPI.decline(token, id!);
        router.replace('/(tabs)');
      }
    } catch (e) {
      showError(router, accept ? t('push.acceptFailed') : t('push.declineFailed'), e);
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={ui.page} contentContainerStyle={ui.container}>
      <BackButton onPress={() => router.replace('/(tabs)')} />
      <View style={ui.statusCard}>
        <Avatar person={group.host} size={64} />
        <Text style={[ui.title, { marginTop: 10 }]}>{t('invite.title', { name: group.host.firstName })}</Text>
        <Text style={ui.detail}>
          {open ? (countdown ? t('invite.answerWithin', { time: countdown }) : t('invite.share')) : group.role === 'guest' ? t('invite.inRide') : t('invite.closed')}
        </Text>
        <Text style={ui.price}>{money(group.myPrice, group.currency)}</Text>
        <Text style={ui.hint}>{t('invite.price')}</Text>
      </View>
      <View style={ui.card}>
        <Row label={t('book.pickup')} value={group.pickup} />
        <Row label={t('book.dropoff')} value={group.dropoff} />
        <Row label={t('invite.requested')} value={new Date(group.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} />
        <Row label={t('friends.riders')} value={t('friends.countOf', { count: group.ridersCount, max: group.maxRiders })} />
      </View>
      {open && (
        <>
          <TouchableOpacity style={[ui.primaryBtn, busy && ui.disabled]} onPress={() => answer(true)} disabled={busy}>
            <Text style={ui.primaryBtnText}>{t('invite.accept')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ui.cancelBtn, busy && ui.disabled]} onPress={() => answer(false)} disabled={busy}>
            <Text style={ui.cancelText}>{t('invite.decline')}</Text>
          </TouchableOpacity>
        </>
      )}
      {group.role === 'guest' && (
        <TouchableOpacity style={ui.primaryBtn} onPress={() => router.replace(`/friends-ride/${group.groupId}`)}>
          <Text style={ui.primaryBtnText}>{t('invite.open')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
