import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { PersonAvatar } from '@/components/person-avatar';
import { showError } from '@/components/friends-ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  Badge, Button, colors, Field, formatKm, formatMoney, Icon, IconButton, radius, shadow, space, Text, TextInputFlow as TextInput,
} from '@/design';
import { friendsAPI, socialAPI, type PublicRide, type SearchResult, type SocialOverview, type SocialPerson } from '@/services/api';
import { signalingClient } from '@/services/signalingClient';

// "Join a ride", social style: your circle (friends and people you rode
// with), search, your own Flow code to share, and public rides near you as
// big cards. Riders see each other's first name and photo only.

type Circle = SocialPerson & { kind: 'incoming' | 'friend' | 'recent'; requestId?: number; ridesTogether?: number; requested?: boolean };

export default function JoinScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [social, setSocial] = useState<SocialOverview | null>(null);
  const [rides, setRides] = useState<PublicRide[] | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [code, setCode] = useState('');
  const [sheet, setSheet] = useState<
    | { kind: 'me' }
    | { kind: 'add' }
    | { kind: 'person'; person: Circle | SearchResult }
    | { kind: 'ride'; ride: PublicRide }
    | null
  >(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const pos = await Location.getForegroundPermissionsAsync()
      .then((p) => (p.status === 'granted' ? Location.getLastKnownPositionAsync() : null))
      .catch(() => null);
    const [s, r] = await Promise.all([
      socialAPI.overview(token).catch(() => null),
      friendsAPI.listPublic(token, pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : undefined).catch(() => null),
    ]);
    if (s) setSocial(s);
    setRides(r?.rides ?? []);
  }, [token]);

  useFocusEffect(useCallback(() => {
    load();
    const off = signalingClient.on('social:updated', () => load());
    const timer = setInterval(load, 20_000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, [load]));

  // Search as you type (friends by name; anyone by exact code or number).
  useEffect(() => {
    const q = query.trim();
    if (!token || q.length < 1) {
      Promise.resolve().then(() => setResults(null));
      return undefined;
    }
    const timer = setTimeout(() => {
      socialAPI.search(token, q).then((r) => setResults(r.results)).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, token]);

  const run = async (name: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(name);
    try {
      await fn();
      setSheet(null);
      // iPhone: an alert shown while the sheet closes can be lost or freeze
      // the screen, so it waits for the sheet to be gone.
      if (done) setTimeout(() => Alert.alert(done), Platform.OS === 'ios' ? 450 : 0);
      await load();
      if (query.trim()) socialAPI.search(token!, query.trim()).then((r) => setResults(r.results)).catch(() => {});
    } catch (e) {
      showError(router, 'Could not do that', e);
    } finally {
      setBusy(null);
    }
  };

  const circle: Circle[] = social
    ? [
        ...social.incoming.map((p) => ({ ...p, kind: 'incoming' as const })),
        ...social.friends.map((p) => ({ ...p, kind: 'friend' as const })),
        ...social.recent.map((p) => ({ ...p, kind: 'recent' as const })),
      ]
    : [];

  const joinRide = (ride: PublicRide) =>
    run('join', async () => {
      const { group } = await friendsAPI.joinPublic(token!, ride.groupId);
      router.replace(`/friends-ride/${group.groupId}`);
    });

  const goCode = () => code.trim() && router.push(`/join/${encodeURIComponent(code.trim().toUpperCase())}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="chevron-left" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
          <Text variant="title" style={{ flex: 1 }}>Join a ride</Text>
          <IconButton icon="hash" label="My Flow code" onPress={() => setSheet({ kind: 'me' })} />
          <IconButton icon="user-plus" label="Add a friend" onPress={() => setSheet({ kind: 'add' })} />
        </View>

        {/* Search */}
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search friends, a Flow code or a number"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCapitalize="none"
            accessibilityLabel="Search friends"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={8}>
              <Icon name="x" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {results ? (
          // Search results
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            {results.length === 0 ? (
              <Text color={colors.ink3} style={{ marginTop: space.md }}>
                Nobody found. Ask for their Flow code (like AMINA-4K7P) or type their full phone number.
              </Text>
            ) : (
              results.map((p) => (
                <Pressable key={p.handle} onPress={() => setSheet({ kind: 'person', person: p })} style={styles.resultRow}>
                  <PersonAvatar person={p} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold">{p.firstName}</Text>
                    <Text variant="caption" color={colors.muted}>{relationLabel(p.relation)}</Text>
                  </View>
                  <Icon name="chevron-right" color={colors.muted} />
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <>
            {/* Your circle */}
            <FlatList
              horizontal
              data={circle}
              keyExtractor={(p) => `${p.kind}-${p.handle}`}
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: space.lg, marginHorizontal: -space.xl }}
              contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.lg }}
              ListHeaderComponent={
                <Pressable onPress={() => setSheet({ kind: 'add' })} style={styles.circleItem} accessibilityRole="button" accessibilityLabel="Add a friend">
                  <View style={styles.addCircle}><Icon name="plus" size={24} /></View>
                  <Text variant="caption" weight="semibold">Add</Text>
                </Pressable>
              }
              renderItem={({ item }) => (
                <Pressable onPress={() => setSheet({ kind: 'person', person: item })} style={styles.circleItem} accessibilityRole="button" accessibilityLabel={item.firstName}>
                  <View>
                    <PersonAvatar person={item} size={64} ring={item.kind === 'friend' ? true : 'space'} />
                    {item.kind !== 'friend' && (
                      <View style={[styles.circleBadge, item.kind === 'incoming' && { backgroundColor: colors.ink }]}>
                        <Icon name={item.kind === 'incoming' ? 'bell' : 'plus'} size={11} color={item.kind === 'incoming' ? colors.onDark : colors.ink} />
                      </View>
                    )}
                  </View>
                  <Text variant="caption" weight="semibold" numberOfLines={1}>{item.firstName}</Text>
                </Pressable>
              )}
            />
            {social && circle.length === 0 && (
              <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>
                Add friends with their Flow code. People you share rides with show up here too.
              </Text>
            )}

            {/* Public rides */}
            <View style={styles.sectionHead}>
              <Text variant="heading">For you</Text>
              <Text variant="caption" color={colors.muted}>Public rides nearby</Text>
            </View>
            {rides && rides.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Icon name="users" size={22} />
                <Text weight="semibold" style={{ marginTop: space.sm }}>No public rides near you right now</Text>
                <Text variant="caption" color={colors.muted} align="center">
                  A public ride shows here for a few minutes while its host waits for people, to riders within 15 km of its pickup.
                  Start one: Book → Shared ride → With friends → Public.
                </Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={rides ?? []}
                keyExtractor={(r) => String(r.groupId)}
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -space.xl }}
                contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md }}
                renderItem={({ item }) => (
                  <RideCard ride={item} busy={busy === 'join'}
                    onJoin={() => (item.mine ? router.push(`/friends-ride/${item.groupId}`) : joinRide(item))}
                    onView={() => (item.mine ? router.push(`/friends-ride/${item.groupId}`) : setSheet({ kind: 'ride', ride: item }))} />
                )}
              />
            )}

            {/* Ride code */}
            <View style={styles.sectionHead}>
              <Text variant="heading">Have a ride code?</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field label="Ride code" placeholder="FLOW-4K7P" autoCapitalize="characters" autoCorrect={false}
                  value={code} onChangeText={setCode} onSubmitEditing={goCode} />
              </View>
              <Button label="Go" size="md" onPress={goCode} disabled={!code.trim()} style={{ height: 52 }} />
            </View>
          </>
        )}
      </ScrollView>

      <Sheet visible={sheet !== null} onClose={() => setSheet(null)}>
        {sheet?.kind === 'me' && social && <MyCode me={social.me} />}
        {sheet?.kind === 'add' && <AddFriend busy={busy === 'add'} onSend={(target) => run('add', () => socialAPI.request(token!, target), 'Friend request sent')} />}
        {sheet?.kind === 'person' && (
          <PersonSheet
            person={sheet.person}
            busy={busy}
            onAdd={() => run('add', () => socialAPI.request(token!, { code: sheet.person.handle }), 'Friend request sent')}
            onAccept={(id) => run('accept', () => socialAPI.accept(token!, id))}
            onDecline={(id) => run('decline', () => socialAPI.decline(token!, id))}
            onRemove={() => run('remove', () => socialAPI.remove(token!, sheet.person.handle))}
          />
        )}
        {sheet?.kind === 'ride' && <RideSheet ride={sheet.ride} busy={busy === 'join'} onJoin={() => joinRide(sheet.ride)} />}
      </Sheet>
    </View>
  );
}

const relationLabel = (r: SearchResult['relation']) =>
  ({ friend: 'Friend', incoming: 'Wants to be your friend', outgoing: 'Request sent', recent: 'You rode together', none: 'On Flow' })[r];

const minutesAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'just now' : `${m} min ago`;
};

// A public ride as a big card, like a post: the host's photo, the route and the price.
function RideCard({ ride, busy, onJoin, onView }: { ride: PublicRide; busy: boolean; onJoin: () => void; onView: () => void }) {
  return (
    <View style={styles.card}>
      <View style={StyleSheet.absoluteFill}>
        {ride.host.photoUrl ? (
          <PersonAvatar person={ride.host} fill />
        ) : (
          <View style={styles.cardInitials}>
            <Text weight="extrabold" color="rgba(255,255,255,0.12)" style={{ fontSize: 120, lineHeight: 130 }}>{ride.host.initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardShade} />
      <View style={styles.cardTop}>
        <View style={{ flexDirection: 'row', gap: space.xs }}>
          {ride.mine && <Badge tone="light" icon="star" label="Your ride" />}
          <Badge tone="light" icon="users" label={`${ride.seatsLeft} seat${ride.seatsLeft > 1 ? 's' : ''} left`} />
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text variant="title" color={colors.onDark} numberOfLines={1}>{ride.mine ? 'You' : ride.host.firstName}</Text>
        <Text variant="caption" color={colors.onDarkMuted} numberOfLines={1}>
          {ride.distanceKm != null ? `${formatKm(ride.distanceKm)} away · ` : ''}{minutesAgo(ride.createdAt)}
        </Text>
        <Text weight="semibold" color={colors.onDark} numberOfLines={2} style={{ marginTop: space.sm }}>{ride.pickup} → {ride.dropoff}</Text>
        <Text variant="heading" weight="bold" color={colors.onDark}>{formatMoney(ride.price, ride.currency)}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          <Button size="md" variant="light" label={ride.mine ? 'Open' : 'Join'} icon={ride.mine ? 'arrow-right' : 'user-plus'} onPress={onJoin} loading={busy} style={{ flex: 1, height: 42 }} />
          <Pressable onPress={onView} style={styles.glassBtn} accessibilityRole="button">
            <Text variant="caption" weight="semibold" color={colors.onDark}>View</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* iPhone does not push the sheet up for the keyboard by itself */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.grabber} />
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MyCode({ me }: { me: SocialOverview['me'] }) {
  const copy = async () => {
    await Clipboard.setStringAsync(me.code);
    Alert.alert('Copied', `${me.code} is ready to paste.`);
  };
  const share = () => Share.share({ message: `Add me on Flow to share rides: ${me.code}` }).catch(() => {});
  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <PersonAvatar person={me} size={72} />
      <Text variant="heading">{me.firstName}</Text>
      <Text variant="caption" color={colors.muted}>Your Flow code. Friends add you with it.</Text>
      <View style={styles.codeBox}>
        <Text weight="extrabold" style={{ fontSize: 28, lineHeight: 34, letterSpacing: 2 }} selectable>{me.code}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' }}>
        <Button label="Copy" icon="copy" variant="secondary" onPress={copy} style={{ flex: 1 }} />
        <Button label="Share" icon="share-2" onPress={share} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function AddFriend({ busy, onSend }: { busy: boolean; onSend: (t: { code: string } | { phone: string }) => void }) {
  const [value, setValue] = useState('');
  const isPhone = /^[+\d\s().-]{6,}$/.test(value.trim()) && value.replace(/\D/g, '').length >= 6;
  return (
    <View style={{ gap: space.md }}>
      <Text variant="title">Add a friend</Text>
      <Text color={colors.ink3}>Enter their Flow code (like AMINA-4K7P) or their phone number. They accept, and you can invite each other in one tap.</Text>
      <Field label="Flow code or phone" value={value} onChangeText={setValue} autoCapitalize="characters" autoCorrect={false} />
      <Button label="Send request" icon="user-plus" loading={busy} disabled={!value.trim()}
        onPress={() => onSend(isPhone ? { phone: value.trim() } : { code: value.trim() })} />
    </View>
  );
}

function PersonSheet({ person, busy, onAdd, onAccept, onDecline, onRemove }: {
  person: Circle | SearchResult; busy: string | null;
  onAdd: () => void; onAccept: (id: number) => void; onDecline: (id: number) => void; onRemove: () => void;
}) {
  const kind = 'kind' in person ? person.kind : person.relation;
  const requestId = 'requestId' in person ? person.requestId : undefined;
  const together = 'ridesTogether' in person ? person.ridesTogether : undefined;
  const requested = ('requested' in person && person.requested) || kind === 'outgoing';
  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <PersonAvatar person={person} size={96} ring={kind === 'friend'} />
      <Text variant="title">{person.firstName}</Text>
      <Text variant="caption" color={colors.muted}>
        {kind === 'friend' ? 'Friend' : kind === 'incoming' ? 'Wants to be your friend'
          : together ? `${together} ride${together > 1 ? 's' : ''} together` : 'On Flow'}
      </Text>
      <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.sm }}>
        {kind === 'incoming' && requestId != null ? (
          <>
            <Button label="Accept" icon="check" onPress={() => onAccept(requestId)} loading={busy === 'accept'} />
            <Button label="Decline" variant="secondary" onPress={() => onDecline(requestId)} loading={busy === 'decline'} />
          </>
        ) : kind === 'friend' ? (
          <Button label="Remove friend" variant="danger" onPress={onRemove} loading={busy === 'remove'} />
        ) : requested ? (
          <Button label="Request sent" variant="secondary" icon="clock" disabled onPress={() => {}} />
        ) : (
          <Button label="Add friend" icon="user-plus" onPress={onAdd} loading={busy === 'add'} />
        )}
      </View>
    </View>
  );
}

function RideSheet({ ride, busy, onJoin }: { ride: PublicRide; busy: boolean; onJoin: () => void }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <PersonAvatar person={ride.host} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{ride.host.firstName}</Text>
          <Text variant="caption" color={colors.muted}>Started {minutesAgo(ride.createdAt)}</Text>
        </View>
        <Badge label={`${ride.seatsLeft} left`} icon="users" />
      </View>
      <View style={styles.rideBox}>
        <Text variant="caption" color={colors.muted}>From</Text>
        <Text weight="semibold">{ride.pickup}</Text>
        <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>To</Text>
        <Text weight="semibold">{ride.dropoff}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text color={colors.ink3}>Your price</Text>
        <Text variant="heading" weight="bold">{formatMoney(ride.price, ride.currency)}</Text>
      </View>
      {ride.distanceKm != null && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text color={colors.ink3}>Pickup from you</Text>
          <Text weight="semibold">{formatKm(ride.distanceKm)}</Text>
        </View>
      )}
      <Button label="Join this ride" icon="user-plus" onPress={onJoin} loading={busy} style={{ marginTop: space.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, paddingTop: 56, paddingBottom: space.xxxl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg, height: 52, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.lg,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, height: '100%' },
  circleItem: { alignItems: 'center', gap: 6, width: 76 },
  addCircle: {
    margin: 5, width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ink3,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  circleBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface,
    borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  card: { width: 260, height: 340, borderRadius: radius.xxl, overflow: 'hidden', backgroundColor: colors.night, ...shadow.float },
  cardInitials: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.night2 },
  cardShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  cardTop: { position: 'absolute', top: space.lg, left: space.lg },
  cardBottom: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg },
  glassBtn: {
    height: 42, paddingHorizontal: space.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  emptyFeed: { alignItems: 'center', padding: space.xl, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.xxl, paddingTop: space.md, ...shadow.float },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.lg },
  codeBox: { paddingHorizontal: space.xl, paddingVertical: space.lg, borderRadius: radius.xl, backgroundColor: colors.soft, alignSelf: 'stretch', alignItems: 'center' },
  rideBox: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.soft },
});
