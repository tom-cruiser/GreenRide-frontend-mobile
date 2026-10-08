import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '@/design';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { friendsAPI, type FriendsGroup } from '@/services/api';
import { Avatar, BackButton, ACCENT, Row, money, showError, ui, useCountdown, useLiveGroup } from '@/components/friends-ui';

// Opened from an invitation notification: who invited, the ride, the price, Accept / Decline.
export default function InvitationScreen() {
  const router = useRouter();
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
      setError(e instanceof Error ? e.message : 'Could not load the invitation.');
    }
  }, [token, id]);
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
      showError(router, accept ? 'Could not accept' : 'Could not decline', e);
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
        <Text style={[ui.title, { marginTop: 10 }]}>{group.host.firstName} invited you</Text>
        <Text style={ui.detail}>
          {open ? (countdown ? `Answer within ${countdown}` : 'Share a ride') : group.role === 'guest' ? 'You are in this ride' : 'This invitation is closed'}
        </Text>
        <Text style={ui.price}>{money(group.myPrice, group.currency)}</Text>
        <Text style={ui.hint}>Your price, paid from your wallet</Text>
      </View>
      <View style={ui.card}>
        <Row label="Pickup" value={group.pickup} />
        <Row label="Drop-off" value={group.dropoff} />
        <Row label="Requested" value={new Date(group.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
        <Row label="Riders" value={`${group.ridersCount} of ${group.maxRiders}`} />
      </View>
      {open && (
        <>
          <TouchableOpacity style={[ui.primaryBtn, busy && ui.disabled]} onPress={() => answer(true)} disabled={busy}>
            <Text style={ui.primaryBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ui.cancelBtn, busy && ui.disabled]} onPress={() => answer(false)} disabled={busy}>
            <Text style={ui.cancelText}>Decline</Text>
          </TouchableOpacity>
        </>
      )}
      {group.role === 'guest' && (
        <TouchableOpacity style={ui.primaryBtn} onPress={() => router.replace(`/friends-ride/${group.groupId}`)}>
          <Text style={ui.primaryBtnText}>Open the ride</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
