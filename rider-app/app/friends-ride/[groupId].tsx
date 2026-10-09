import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, View, StyleSheet } from 'react-native';
import { Badge, Button, Card, colors, Field, Header, Icon, Row, Screen, space, Text } from '@/design';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { friendsAPI, socialAPI, type FriendsGroup, type SocialPerson } from '@/services/api';
import { PersonAvatar } from '@/components/person-avatar';
import { StatusChip, money, showError, useCountdown, useLiveGroup } from '@/components/friends-ui';

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
  // The host's friends, for one-tap invitations.
  const [friends, setFriends] = useState<SocialPerson[]>([]);
  const [invitedHandles, setInvitedHandles] = useState<string[]>([]);
  useEffect(() => {
    if (token) socialAPI.overview(token).then((o) => setFriends(o.friends)).catch(() => {});
  }, [token]);

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
      <Screen scroll={false} contentStyle={styles.center}>
        {error ? (
          <>
            <Icon name="slash" size={32} color={colors.muted} />
            <Text variant="title" align="center" style={{ marginTop: space.lg }}>Ride not available</Text>
            <Text color={colors.ink3} align="center" style={{ marginTop: space.xs }}>{error}</Text>
            <Button label="Home" onPress={() => router.replace('/(tabs)')} style={{ marginTop: space.xl, alignSelf: 'stretch' }} />
          </>
        ) : (
          <ActivityIndicator size="large" color={colors.ink} />
        )}
      </Screen>
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

  // The host alone pays the solo fare; it drops once a friend joins.
  const alone = isHost && group.ridersCount <= 1;
  const dropsTo = group.priceIfJoined?.host ?? group.price.guest;

  return (
    <Screen>
      <Header title={isHost ? 'Ride with friends' : 'Shared ride'} onBack={() => router.replace('/(tabs)')} backLabel="Home" />

      {/* Status and your price */}
      <Card dark>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {gathering && !group.expired && <ActivityIndicator color={colors.onDark} />}
          <Text variant="overline" color={colors.onDarkMuted}>{header.detail}</Text>
        </View>
        <Text variant="title" color={colors.onDark} style={{ marginTop: space.xs }}>{header.title}</Text>
        <View style={{ marginTop: space.sm }}>
          <Badge tone="light" label={group.visibility === 'public' ? 'Public: riders nearby can join' : 'Friends only'} icon={group.visibility === 'public' ? 'globe' : 'lock'} />
        </View>
        <Text color={colors.onDarkMuted} style={{ marginTop: space.lg }}>{alone ? 'Your price alone' : `Your price with ${group.ridersCount} riders`}</Text>
        <Text color={colors.onDark} weight="extrabold" style={{ fontSize: 40, lineHeight: 46, letterSpacing: -1.2 }}>
          {money(group.myPrice, group.currency)}
        </Text>
        {alone && gathering && dropsTo < group.myPrice && (
          <Text color={colors.onDarkMuted}>Drops to {money(dropsTo, group.currency)} when a friend joins.</Text>
        )}
      </Card>

      {/* Trip */}
      <Card style={{ marginTop: space.md }}>
        <Row label="From" value={group.pickup} />
        <Row label="To" value={group.dropoff} />
        <Row label="Riders" value={`${group.ridersCount} of ${group.maxRiders}`} />
        {!isHost && (
          <View style={styles.hostRow}>
            <Text color={colors.ink3}>Host</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <PersonAvatar person={group.host} size={28} />
              <Text weight="semibold">{group.host.firstName}</Text>
            </View>
          </View>
        )}
      </Card>

      {/* Invite: friends in one tap, the code, or a phone number */}
      {isHost && gathering && !group.expired && (
        <Card style={{ marginTop: space.md }}>
          {friends.length > 0 && (
            <>
              <Text variant="heading">Invite friends</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.md, marginHorizontal: -space.xl }}
                contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.xl }}>
                {friends.map((f) => {
                  const done = invitedHandles.includes(f.handle);
                  return (
                    <Pressable key={f.handle} disabled={done || busy === `friend-${f.handle}`} accessibilityRole="button" accessibilityLabel={`Invite ${f.firstName}`}
                      style={{ alignItems: 'center', gap: 6, width: 68, opacity: done ? 0.45 : 1 }}
                      onPress={() => run(`friend-${f.handle}`, async () => {
                        await friendsAPI.inviteFriend(token!, group.groupId, f.handle);
                        setInvitedHandles((list) => [...list, f.handle]);
                      }, 'Could not invite')}>
                      <PersonAvatar person={f} size={56} ring />
                      <Text variant="caption" weight="semibold" numberOfLines={1}>{done ? 'Invited' : f.firstName}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.divider} />
            </>
          )}

          <Text variant="heading">Ride code</Text>
          <View style={styles.codeRow}>
            <Text weight="extrabold" style={{ fontSize: 24, lineHeight: 30, letterSpacing: 1.5, flex: 1 }} numberOfLines={1} adjustsFontSizeToFit selectable>{group.code}</Text>
            <Button size="md" variant="secondary" icon="copy" label="Copy" onPress={copyCode} />
          </View>
          <Button label="Share by WhatsApp or SMS" icon="share-2" onPress={share} style={{ marginTop: space.md }} />
          <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>Friends enter the code in Flow under “Join a ride”.</Text>

          <View style={styles.divider} />
          <Field label="Invite by phone number" placeholder="+257 79 123 456" keyboardType="phone-pad" value={phone}
            onChangeText={setPhone} onSubmitEditing={invite} hint="They need a Flow rider account with this number." />
          <Button label="Invite" variant="secondary" icon="send" onPress={invite} loading={busy === 'invite'} disabled={!phone.trim()} style={{ marginTop: space.md }} />
        </Card>
      )}

      {/* Who's in */}
      {isHost && (group.guests?.length ?? 0) > 0 && (
        <Card style={{ marginTop: space.md }}>
          <Text variant="heading">Friends</Text>
          {[...joined, ...invited, ...others].map((guest) => (
            <View key={guest.invitationId} style={styles.guest}>
              <PersonAvatar person={guest} size={44} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text weight="semibold">{guest.firstName}</Text>
                <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                  <StatusChip status={guest.status} />
                  {guest.price != null && <Text variant="caption" color={colors.muted}>{money(guest.price, group.currency)}</Text>}
                </View>
              </View>
              {gathering && ['accepted', 'invited'].includes(guest.status) && (
                <Button size="md" variant="danger" label="Remove" onPress={() => remove(guest.invitationId, guest.firstName)}
                  loading={busy === `remove-${guest.invitationId}`} />
              )}
            </View>
          ))}
        </Card>
      )}

      {/* Next step */}
      <View style={{ gap: space.sm, marginTop: space.xl }}>
        {isHost && gathering && (joined.length > 0 ? (
          <Button size="lg" label={`Request driver (${group.ridersCount} riders)`} icon="navigation" onPress={() => request(false)} loading={busy === 'request'} />
        ) : (
          <Button size="lg" variant="secondary" label={`Go alone · ${money(group.price.host, group.currency)}`} onPress={() => request(true)} loading={busy === 'request'} />
        ))}
        {group.status === 'requested' && (
          <Button size="lg" label="Follow the ride" icon="arrow-right" onPress={() => router.replace('/active-ride')} />
        )}
        {group.status !== 'cancelled' && group.myRideId != null && (
          <Button variant="danger" label={isHost ? 'Cancel ride' : 'Leave ride'} onPress={leave} loading={busy === 'leave'} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  hostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.lg },
  guest: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md },
});
