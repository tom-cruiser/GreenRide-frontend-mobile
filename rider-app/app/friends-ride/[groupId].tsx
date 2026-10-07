import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { friendsAPI, type FriendsGroup } from '@/services/api';
import { Avatar, BackButton, GREEN, Row, StatusChip, money, showError, ui, useCountdown, useLiveGroup } from '@/components/friends-ui';

// A "share with friends" ride. The host shares the code, invites by phone,
// sees friends join live, can remove a guest, and requests the driver.
// Guests see the host, the ride and their price, and can leave.

export default function FriendsRideScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { token, updateWalletBalance } = useAuth();
  const [group, setGroup] = useState<FriendsGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token || !groupId) return;
    try {
      const { group: next } = await friendsAPI.get(token, groupId);
      setGroup(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the ride.');
    }
  }, [token, groupId]);
  useLiveGroup(groupId, reload);

  const countdown = useCountdown(group?.status === 'gathering' ? group.expiresAt : null);

  // Someone opening a ride they were only invited to: show the invitation.
  const invitationId = group?.role === 'invited' ? group.invitation?.id : undefined;
  useEffect(() => {
    if (invitationId) router.replace(`/invitation/${invitationId}`);
  }, [invitationId, router]);

  // Runs an action, shows its error, then refreshes.
  const run = async (name: string, fn: () => Promise<unknown>, errorTitle: string) => {
    setBusy(name);
    try {
      await fn();
      updateWalletBalance();
      await reload();
    } catch (e) {
      showError(router, errorTitle, e);
    } finally {
      setBusy(null);
    }
  };

  if (!group) {
    return (
      <View style={[ui.page, ui.center]}>
        {error ? (
          <>
            <Text style={ui.title}>Ride not available</Text>
            <Text style={ui.detail}>{error}</Text>
            <TouchableOpacity style={ui.primaryBtn} onPress={() => router.replace('/(tabs)')}>
              <Text style={ui.primaryBtnText}>Home</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color={GREEN} />
        )}
      </View>
    );
  }

  if (invitationId) return null;

  const isHost = group.role === 'host';
  const gathering = group.status === 'gathering';
  const joined = (group.guests ?? []).filter((g) => g.status === 'accepted');
  const invited = (group.guests ?? []).filter((g) => g.status === 'invited');
  const others = (group.guests ?? []).filter((g) => !['accepted', 'invited'].includes(g.status));
  const shareMessage = `Ride with me on Flow from ${group.pickup} to ${group.dropoff}. ` +
    `Open the app and enter the code ${group.code}, or tap ${group.link}`;

  const copyCode = async () => {
    await Clipboard.setStringAsync(group.code);
    Alert.alert('Code copied', `${group.code} is ready to paste.`);
  };

  const share = () => Share.share({ message: shareMessage }).catch(() => {});

  const invite = () => {
    if (!token || !phone.trim()) return;
    run('invite', async () => {
      const { invitation } = await friendsAPI.invite(token, group.groupId, phone.trim());
      setPhone('');
      Alert.alert('Invitation sent', `${invitation.firstName} will get a notification.`);
    }, 'Could not invite');
  };

  const remove = (invitationId: number, name: string) =>
    Alert.alert(`Remove ${name}?`, 'Their money goes back to their wallet.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(`remove-${invitationId}`, () => friendsAPI.removeGuest(token!, group.groupId, invitationId), 'Could not remove') },
    ]);

  const request = (alone: boolean) =>
    Alert.alert(
      alone ? 'Go alone?' : 'Request a driver?',
      alone
        ? `You will pay the solo price, ${money(group.price.host, group.currency)}.`
        : `Nobody else can join after this. Each rider pays ${money(group.price.guest, group.currency)}.`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: alone ? 'Go alone' : 'Request driver', onPress: () => run('request', () => friendsAPI.requestDriver(token!, group.groupId, alone), 'Could not request a driver') },
      ],
    );

  const leave = () =>
    Alert.alert(
      isHost ? 'Cancel the ride for everyone?' : 'Leave this ride?',
      isHost ? 'Everyone gets their money back.' : 'Your money goes back to your wallet.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: isHost ? 'Cancel ride' : 'Leave',
          style: 'destructive',
          onPress: () => run('leave', async () => {
            await friendsAPI.leave(token!, group.groupId);
            router.replace('/(tabs)');
          }, 'Could not leave'),
        },
      ],
    );

  const header = group.status === 'cancelled'
    ? { title: 'Ride cancelled', detail: 'Any money held for it is back in your wallet.' }
    : group.status === 'requested'
      ? { title: 'Looking for a driver', detail: 'Your group is one request for the drivers.' }
      : isHost
        ? group.expired
          ? { title: 'Time is up', detail: joined.length ? 'Request a driver for the friends who joined, or cancel.' : 'Nobody joined in time. Go alone or cancel.' }
          : { title: 'Invite your friends', detail: countdown ? `Invitations close in ${countdown}` : 'Waiting for friends' }
        : { title: `Riding with ${group.host.firstName}`, detail: `${group.host.firstName} will request the driver.` };

  return (
    <ScrollView style={ui.page} contentContainerStyle={ui.container} keyboardShouldPersistTaps="handled">
      <BackButton onPress={() => router.replace('/(tabs)')} />

      <View style={ui.statusCard}>
        {gathering && !group.expired && <ActivityIndicator color={GREEN} style={{ marginBottom: 8 }} />}
        <Text style={ui.title}>{header.title}</Text>
        <Text style={ui.detail}>{header.detail}</Text>
        <Text style={ui.price}>{money(group.myPrice, group.currency)}</Text>
        <Text style={ui.hint}>
          {group.ridersCount > 1 || !isHost
            ? `Your price with ${group.ridersCount} riders`
            : `Your price alone. It drops to ${money(group.price.guest, group.currency)} when a friend joins.`}
        </Text>
      </View>

      <View style={ui.card}>
        <Row label="From" value={group.pickup} />
        <Row label="To" value={group.dropoff} />
        <Row label="Riders" value={`${group.ridersCount} of ${group.maxRiders}`} />
        {!isHost && (
          <View style={[ui.row, { alignItems: 'center' }]}>
            <Text style={ui.rowLabel}>Host</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Avatar person={group.host} size={28} />
              <Text style={ui.rowValue}>{group.host.firstName}</Text>
            </View>
          </View>
        )}
      </View>

      {isHost && gathering && !group.expired && (
        <View style={ui.card}>
          <Text style={ui.cardTitle}>Ride code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.code} selectable>{group.code}</Text>
            <TouchableOpacity style={styles.smallBtn} onPress={copyCode} accessibilityLabel="Copy the ride code">
              <Text style={styles.smallBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={ui.primaryBtn} onPress={share}>
            <Text style={ui.primaryBtnText}>Share by WhatsApp or SMS</Text>
          </TouchableOpacity>
          <Text style={ui.hint}>Friends enter the code in Flow under “Join a ride”.</Text>

          <Text style={[ui.cardTitle, { marginTop: 18 }]}>Invite by phone number</Text>
          <TextInput
            style={ui.input}
            placeholder="+257 79 123 456"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            onSubmitEditing={invite}
          />
          <TouchableOpacity style={[ui.secondaryBtn, (!phone.trim() || busy === 'invite') && ui.disabled]} onPress={invite} disabled={!phone.trim() || busy === 'invite'}>
            <Text style={ui.secondaryBtnText}>{busy === 'invite' ? 'Inviting…' : 'Invite'}</Text>
          </TouchableOpacity>
          <Text style={ui.hint}>They must have a Flow rider account with this number.</Text>
        </View>
      )}

      {isHost && (group.guests?.length ?? 0) > 0 && (
        <View style={ui.card}>
          <Text style={ui.cardTitle}>Friends</Text>
          {[...joined, ...invited, ...others].map((guest) => (
            <View key={guest.invitationId} style={styles.guest}>
              <Avatar person={guest} />
              <View style={{ flex: 1 }}>
                <Text style={styles.guestName}>{guest.firstName}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <StatusChip status={guest.status} />
                  {guest.price != null && <Text style={ui.hint}>{money(guest.price, group.currency)}</Text>}
                </View>
              </View>
              {gathering && ['accepted', 'invited'].includes(guest.status) && (
                <TouchableOpacity
                  style={[styles.removeBtn, busy === `remove-${guest.invitationId}` && ui.disabled]}
                  onPress={() => remove(guest.invitationId, guest.firstName)}
                  disabled={busy === `remove-${guest.invitationId}`}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {isHost && gathering && (
        joined.length > 0 ? (
          <TouchableOpacity style={[ui.primaryBtn, busy === 'request' && ui.disabled]} onPress={() => request(false)} disabled={busy === 'request'}>
            <Text style={ui.primaryBtnText}>{busy === 'request' ? 'Requesting…' : `Request driver (${group.ridersCount} riders)`}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[ui.secondaryBtn, busy === 'request' && ui.disabled]} onPress={() => request(true)} disabled={busy === 'request'}>
            <Text style={ui.secondaryBtnText}>Go alone</Text>
          </TouchableOpacity>
        )
      )}

      {group.status === 'requested' && (
        <TouchableOpacity style={ui.primaryBtn} onPress={() => router.replace('/active-ride')}>
          <Text style={ui.primaryBtnText}>Follow the ride</Text>
        </TouchableOpacity>
      )}

      {group.status !== 'cancelled' && group.myRideId != null && (
        <TouchableOpacity style={[ui.cancelBtn, busy === 'leave' && ui.disabled]} onPress={leave} disabled={busy === 'leave'}>
          <Text style={ui.cancelText}>{isHost ? 'Cancel ride' : 'Leave ride'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  code: { fontSize: 30, fontWeight: '800', letterSpacing: 3, color: '#111827', fontVariant: ['tabular-nums'] },
  smallBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  smallBtnText: { color: '#166534', fontWeight: '700' },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  guestName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  removeText: { color: '#b91c1c', fontWeight: '700' },
});
