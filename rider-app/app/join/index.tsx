import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PersonAvatar } from '@/components/person-avatar';
import { showError, useCountdown } from '@/components/friends-ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  Badge, Button, colors, Field, formatKm, formatMoney, Icon, IconButton, radius, shadow, space, Text, TextInputFlow as TextInput,
} from '@/design';
import { friendsAPI, socialAPI, type PublicRide, type SearchResult, type SocialOverview, type SocialPerson, ridesAPI } from '@/services/api';
import { signalingClient } from '@/services/signalingClient';
import { useT } from '@/i18n';

type T = ReturnType<typeof useT>['t'];

// "Join a ride", social style: your circle (friends and people you rode
// with), search, your own Flow code to share, and public rides near you as
// big cards. Riders see each other's first name and photo only.

type Circle = SocialPerson & { kind: 'incoming' | 'friend' | 'recent'; requestId?: number; ridesTogether?: number; requested?: boolean };

export default function JoinScreen() {
  const router = useRouter();
  const { t } = useT();
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
  const insets = useSafeAreaInsets();

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
      showError(router, t('join.actionFailed'), e);
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

  // Your own ride opens it; someone else's joins it.
  const openRide = (ride: PublicRide) =>
    router.push(ride.kind === 'others' ? '/active-ride' : `/friends-ride/${ride.groupId}`);
  const joinRide = (ride: PublicRide) =>
    ride.mine ? openRide(ride) : run('join', async () => {
      if (ride.kind === 'others') {
        const pos = await Location.getLastKnownPositionAsync().catch(() => null);
        await ridesAPI.joinShared(token!, ride.groupId, pos ? { pickup_lat: pos.coords.latitude, pickup_lng: pos.coords.longitude } : undefined);
        router.replace('/active-ride');
        return;
      }
      const { group } = await friendsAPI.joinPublic(token!, ride.groupId);
      router.replace(`/friends-ride/${group.groupId}`);
    });

  // Book, with Shared ride → With friends (and Public or Friends only) already chosen.
  const startRide = (visibility: 'friends' | 'public') =>
    router.push({ pathname: '/(tabs)/ride-booking', params: { share: 'friends', visibility } });

  const goCode = () => code.trim() && router.push(`/join/${encodeURIComponent(code.trim().toUpperCase())}`);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="chevron-left" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
          <Text variant="title" style={{ flex: 1 }}>{t('join.title')}</Text>
          <IconButton icon="hash" label={t('join.myCode')} onPress={() => setSheet({ kind: 'me' })} />
          <IconButton icon="user-plus" label={t('join.addFriend')} onPress={() => setSheet({ kind: 'add' })} />
        </View>

        {/* Search */}
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('join.search')}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCapitalize="none"
            accessibilityLabel={t('join.searchLabel')}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel={t('join.clear')} hitSlop={8}>
              <Icon name="x" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {results ? (
          // Search results
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            {results.length === 0 ? (
              <Text color={colors.ink3} style={{ marginTop: space.md }}>
                {t('join.nobody')}
              </Text>
            ) : (
              results.map((p) => (
                <Pressable key={p.handle} onPress={() => setSheet({ kind: 'person', person: p })} style={styles.resultRow}>
                  <PersonAvatar person={p} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold">{p.firstName}</Text>
                    <Text variant="caption" color={colors.muted}>{relationLabel(p.relation, t)}</Text>
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
                <Pressable onPress={() => setSheet({ kind: 'add' })} style={styles.circleItem} accessibilityRole="button" accessibilityLabel={t('join.addFriend')}>
                  <View style={styles.addCircle}><Icon name="plus" size={24} /></View>
                  <Text variant="caption" weight="semibold">{t('join.add')}</Text>
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
                {t('join.circleEmpty')}
              </Text>
            )}

            {/* Public rides */}
            <View style={styles.sectionHead}>
              <Text variant="heading">{t('join.forYou')}</Text>
              <Text variant="caption" color={colors.muted}>{t('join.publicNearby')}</Text>
            </View>
            {rides && rides.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Icon name="users" size={22} />
                <Text weight="semibold" style={{ marginTop: space.sm }}>{t('join.noPublic')}</Text>
                <Text variant="caption" color={colors.muted} align="center">
                  {t('join.noPublicText')}
                </Text>
                <Button size="md" label={t('join.startPublic')} icon="plus" onPress={() => startRide('public')}
                  style={{ marginTop: space.md, alignSelf: 'stretch' }} />
              </View>
            ) : (
              // Two rides per row; more rows follow down the page.
              <View style={styles.grid}>
                {(rides ?? []).map((item) => (
                  <RideCard key={`${item.kind}-${item.groupId}`} ride={item} busy={busy === 'join'}
                    onJoin={() => joinRide(item)}
                    onView={() => (item.mine ? openRide(item) : setSheet({ kind: 'ride', ride: item }))} />
                ))}
              </View>
            )}

          </>
        )}
      </ScrollView>

      {/* Pinned to the bottom, seen as soon as the screen opens; the rides
          scroll above it. Hidden while search results are shown. */}
      {!results && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          {/* Nothing to join? Start one: opens Book with "With friends" chosen. */}
          <Pressable onPress={() => startRide('friends')} accessibilityRole="button" style={styles.startRide}>
            <View style={styles.startIcon}><Icon name="plus" size={20} color={colors.onDark} /></View>
            <View style={{ flex: 1 }}>
              <Text weight="semibold">{t('join.startOwn')}</Text>
              <Text variant="caption" color={colors.muted}>{t('join.startOwnText')}</Text>
            </View>
            <Icon name="chevron-right" color={colors.muted} />
          </Pressable>
          {/* Have a ride code? */}
          <Text variant="heading" style={{ marginTop: space.sm }}>{t('join.haveCode')}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label={t('friends.code')} placeholder="FLOW-4K7P" autoCapitalize="characters" autoCorrect={false}
                value={code} onChangeText={setCode} onSubmitEditing={goCode} returnKeyType="go" />
            </View>
            <Button label={t('join.go')} size="md" onPress={goCode} disabled={!code.trim()} style={{ height: 52 }} />
          </View>
        </View>
      )}

      <Sheet visible={sheet !== null} onClose={() => setSheet(null)}>
        {sheet?.kind === 'me' && social && <MyCode me={social.me} />}
        {sheet?.kind === 'add' && <AddFriend busy={busy === 'add'} onSend={(target) => run('add', () => socialAPI.request(token!, target), t('join.requestSent'))} />}
        {sheet?.kind === 'person' && (
          <PersonSheet
            person={sheet.person}
            busy={busy}
            onAdd={() => run('add', () => socialAPI.request(token!, { code: sheet.person.handle }), t('join.requestSent'))}
            onAccept={(id) => run('accept', () => socialAPI.accept(token!, id))}
            onDecline={(id) => run('decline', () => socialAPI.decline(token!, id))}
            onRemove={() => run('remove', () => socialAPI.remove(token!, sheet.person.handle))}
          />
        )}
        {sheet?.kind === 'ride' && <RideSheet ride={sheet.ride} busy={busy === 'join'} onJoin={() => joinRide(sheet.ride)} />}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const relationLabel = (r: SearchResult['relation'], t: T) =>
  ({
    friend: t('join.friend'), incoming: t('join.wantsFriend'), outgoing: t('join.requestSentShort'),
    recent: t('join.rodeTogether'), none: t('join.onFlow'),
  })[r];

const minutesAgo = (iso: string, t: T) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? t('join.justNow') : m < 60 ? t('join.minAgo', { count: m }) : t('join.hAgo', { count: Math.round(m / 60) });
};

// "Closes in 24:10" while a public ride is still open to join. "With others"
// rides have no time limit (null). Gone at zero: the next refresh drops it.
function useClosesIn(expiresAt: string | null): string | null {
  const { t } = useT();
  const left = useCountdown(expiresAt);
  if (!expiresAt) return null;
  return left ? t('join.closesIn', { time: left }) : t('join.closing');
}

// "Current" is how a ride booked from the rider's own position is named.
const place = (name: string, t: T) => (name === 'Current' ? t('join.nearbyPickup') : name);

// A public ride as a card, half the width (two per row): the host's photo, the route and the price.
function RideCard({ ride, busy, onJoin, onView }: { ride: PublicRide; busy: boolean; onJoin: () => void; onView: () => void }) {
  const { t } = useT();
  const closes = useClosesIn(ride.expiresAt);
  return (
    <View style={styles.card}>
      <View style={StyleSheet.absoluteFill}>
        {ride.host.photoUrl ? (
          <PersonAvatar person={ride.host} fill />
        ) : (
          <View style={styles.cardInitials}>
            <Text weight="extrabold" color="rgba(255,255,255,0.12)" style={{ fontSize: 84, lineHeight: 92 }}>{ride.host.initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardShade} />
      <View style={styles.cardTop}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {ride.mine && <Badge tone="light" icon="star" label={t('join.yourRide')} />}
          {ride.kind === 'others' && <Badge tone="light" icon="shuffle" label={t('book.withOthers')} />}
          <Badge tone="light" icon="users" label={t(ride.seatsLeft > 1 ? 'join.seatsLeftN' : 'join.seatLeft', { count: ride.seatsLeft })} />
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text variant="heading" weight="bold" color={colors.onDark} numberOfLines={1}>{ride.mine ? t('home.you') : ride.host.firstName}</Text>
        <Text variant="caption" color={colors.onDarkMuted} numberOfLines={1}>
          {ride.distanceKm != null ? `${t('join.away', { distance: formatKm(ride.distanceKm) })} · ` : ''}{minutesAgo(ride.createdAt, t)}
        </Text>
        {closes && <Text variant="caption" weight="semibold" color={colors.onDark} numberOfLines={1}>{closes}</Text>}
        <Text variant="caption" weight="semibold" color={colors.onDark} numberOfLines={2} style={{ marginTop: space.sm }}>{place(ride.pickup, t)} → {ride.dropoff}</Text>
        <Text variant="heading" weight="bold" color={colors.onDark}>{formatMoney(ride.price, ride.currency)}</Text>
        <View style={{ flexDirection: 'row', gap: space.xs, marginTop: space.sm }}>
          <Button size="md" variant="light" label={ride.mine ? t('common.open') : t('join.joinShort')} onPress={onJoin} loading={busy} style={{ flex: 1, height: 38, paddingHorizontal: space.sm }} />
          <Pressable onPress={onView} style={styles.glassBtn} accessibilityRole="button">
            <Text variant="caption" weight="semibold" color={colors.onDark}>{t('join.view')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* The sheet moves up over the keyboard (Android draws edge-to-edge, so it no longer resizes the screen) */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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
  const { t } = useT();
  const copy = async () => {
    await Clipboard.setStringAsync(me.code);
    Alert.alert(t('profile.copied'), t('profile.copiedText', { code: me.code }));
  };
  const share = () => Share.share({ message: t('join.shareCode', { code: me.code }) }).catch(() => {});
  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <PersonAvatar person={me} size={72} />
      <Text variant="heading">{me.firstName}</Text>
      <Text variant="caption" color={colors.muted}>{t('join.codeText')}</Text>
      <View style={styles.codeBox}>
        <Text weight="extrabold" style={{ fontSize: 28, lineHeight: 34, letterSpacing: 2 }} selectable>{me.code}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' }}>
        <Button label={t('friends.copy')} icon="copy" variant="secondary" onPress={copy} style={{ flex: 1 }} />
        <Button label={t('join.share')} icon="share-2" onPress={share} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function AddFriend({ busy, onSend }: { busy: boolean; onSend: (target: { code: string } | { phone: string }) => void }) {
  const { t } = useT();
  const [value, setValue] = useState('');
  const isPhone = /^[+\d\s().-]{6,}$/.test(value.trim()) && value.replace(/\D/g, '').length >= 6;
  return (
    <View style={{ gap: space.md }}>
      <Text variant="title">{t('join.addFriend')}</Text>
      <Text color={colors.ink3}>{t('join.addFriendText')}</Text>
      <Field label={t('join.codeOrPhone')} value={value} onChangeText={setValue} autoCapitalize="characters" autoCorrect={false} />
      <Button label={t('join.sendRequest')} icon="user-plus" loading={busy} disabled={!value.trim()}
        onPress={() => onSend(isPhone ? { phone: value.trim() } : { code: value.trim() })} />
    </View>
  );
}

function PersonSheet({ person, busy, onAdd, onAccept, onDecline, onRemove }: {
  person: Circle | SearchResult; busy: string | null;
  onAdd: () => void; onAccept: (id: number) => void; onDecline: (id: number) => void; onRemove: () => void;
}) {
  const { t } = useT();
  const kind = 'kind' in person ? person.kind : person.relation;
  const requestId = 'requestId' in person ? person.requestId : undefined;
  const together = 'ridesTogether' in person ? person.ridesTogether : undefined;
  const requested = ('requested' in person && person.requested) || kind === 'outgoing';
  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <PersonAvatar person={person} size={96} ring={kind === 'friend'} />
      <Text variant="title">{person.firstName}</Text>
      <Text variant="caption" color={colors.muted}>
        {kind === 'friend' ? t('join.friend') : kind === 'incoming' ? t('join.wantsFriend')
          : together ? t(together > 1 ? 'join.ridesTogether' : 'join.rideTogether', { count: together }) : t('join.onFlow')}
      </Text>
      <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.sm }}>
        {kind === 'incoming' && requestId != null ? (
          <>
            <Button label={t('invite.accept')} icon="check" onPress={() => onAccept(requestId)} loading={busy === 'accept'} />
            <Button label={t('invite.decline')} variant="secondary" onPress={() => onDecline(requestId)} loading={busy === 'decline'} />
          </>
        ) : kind === 'friend' ? (
          <Button label={t('join.removeFriend')} variant="danger" onPress={onRemove} loading={busy === 'remove'} />
        ) : requested ? (
          <Button label={t('join.requestSentShort')} variant="secondary" icon="clock" disabled onPress={() => {}} />
        ) : (
          <Button label={t('join.addFriendShort')} icon="user-plus" onPress={onAdd} loading={busy === 'add'} />
        )}
      </View>
    </View>
  );
}

function RideSheet({ ride, busy, onJoin }: { ride: PublicRide; busy: boolean; onJoin: () => void }) {
  const { t } = useT();
  const closes = useClosesIn(ride.expiresAt);
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <PersonAvatar person={ride.host} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{ride.host.firstName}</Text>
          <Text variant="caption" color={colors.muted}>{t('join.started', { time: minutesAgo(ride.createdAt, t) })}{closes ? ` · ${closes}` : ''}</Text>
        </View>
        <Badge label={t('join.left', { count: ride.seatsLeft })} icon="users" />
      </View>
      <View style={styles.rideBox}>
        <Text variant="caption" color={colors.muted}>{t('book.from')}</Text>
        <Text weight="semibold">{place(ride.pickup, t)}</Text>
        <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>{t('book.to')}</Text>
        <Text weight="semibold">{ride.dropoff}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text color={colors.ink3}>{t('book.yourPrice')}</Text>
        <Text variant="heading" weight="bold">{formatMoney(ride.price, ride.currency)}</Text>
      </View>
      {ride.distanceKm != null && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text color={colors.ink3}>{t('join.pickupFromYou')}</Text>
          <Text weight="semibold">{formatKm(ride.distanceKm)}</Text>
        </View>
      )}
      <Button label={t('join.joinThis')} icon="user-plus" onPress={onJoin} loading={busy} style={{ marginTop: space.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, paddingTop: 56, paddingBottom: space.xxl },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  card: { width: '48.5%', height: 290, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.night, ...shadow.float },
  cardInitials: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.night2 },
  cardShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  cardTop: { position: 'absolute', top: space.md, left: space.md, right: space.md },
  cardBottom: { position: 'absolute', left: space.md, right: space.md, bottom: space.md },
  glassBtn: {
    height: 38, paddingHorizontal: space.md, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  footer: {
    gap: space.md, paddingHorizontal: space.xl, paddingTop: space.lg, backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, ...shadow.float,
  },
  startRide: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg,
    borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  startIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  emptyFeed: { alignItems: 'center', padding: space.xl, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.xxl, paddingTop: space.md, ...shadow.float },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.lg },
  codeBox: { paddingHorizontal: space.xl, paddingVertical: space.lg, borderRadius: radius.xl, backgroundColor: colors.soft, alignSelf: 'stretch', alignItems: 'center' },
  rideBox: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.soft },
});
