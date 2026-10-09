import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { PersonAvatar } from '@/components/person-avatar';
import { EMERGENCY } from '@/config/safety';
import { useAuth } from '@/contexts/AuthContext';
import { Button, colors, firstName, Icon, IconButton, type IconName, radius, shadow, space, Text } from '@/design';
import { ridesAPI, socialAPI, type SocialPerson } from '@/services/api';

// Safety, in the same style as "Join a ride": help first (emergency call,
// your emergency contact), your circle with "Share my trip", tips as cards,
// and reporting a problem to the Flow team.

type ActiveRide = { id: number; status: string; pickup: string; dropoff: string; driver_name: string | null };

const TIPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'eye', title: 'Check the car', text: 'Match the driver and the car in the app before you get in.' },
  { icon: 'share-2', title: 'Share your trip', text: 'Send your ride to someone you trust, every time.' },
  { icon: 'user', title: 'Sit in the back', text: 'It gives you and the driver some space.' },
  { icon: 'alert-triangle', title: 'Trust yourself', text: 'Feel unsafe? Ask to stop in a busy place and call for help.' },
];

export default function SafetyScreen() {
  const router = useRouter();
  const { token, user, refreshUser } = useAuth();
  const [friends, setFriends] = useState<SocialPerson[]>([]);
  const [ride, setRide] = useState<ActiveRide | null>(null);

  useFocusEffect(useCallback(() => {
    refreshUser();
    if (!token) return;
    socialAPI.overview(token).then((o) => setFriends(o.friends)).catch(() => {});
    ridesAPI.getActiveRide(token).then((r) => setRide(r.ride ?? null)).catch(() => setRide(null));
  }, [token, refreshUser]));

  const contact = user?.emergency_contact || null;
  const call = (number: string, who: string) =>
    Alert.alert(`Call ${who}?`, number, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', style: 'destructive', onPress: () => Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`).catch(() => {}) },
    ]);

  const shareTrip = () => {
    if (!ride) return;
    const driver = firstName(ride.driver_name);
    const lines = [
      `I'm on a Flow ride from ${ride.pickup} to ${ride.dropoff}.`,
      driver ? `My driver is ${driver}.` : 'The driver is on the way.',
      `${user?.name ? firstName(user.name) : 'Me'} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    ];
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <Text variant="title" style={{ flex: 1 }}>Safety</Text>
        <IconButton icon="phone" label={`Call ${EMERGENCY.label}`} onPress={() => call(EMERGENCY.number, EMERGENCY.label)} />
      </View>

      {/* Help, first */}
      <View style={styles.sos}>
        <View style={styles.sosIcon}><Icon name="alert-octagon" size={26} color={colors.onDark} /></View>
        <Text variant="title" color={colors.onDark} style={{ marginTop: space.md }}>In danger?</Text>
        <Text color={colors.onDarkMuted} style={{ marginTop: 2 }}>Call for help now. Your safety comes first.</Text>
        <Button size="lg" variant="light" icon="phone" label={`Call ${EMERGENCY.number}`} onPress={() => call(EMERGENCY.number, EMERGENCY.label)}
          style={{ marginTop: space.lg }} />
        {contact ? (
          <Button size="lg" variant="ghostDark" icon="heart" label={`Call your emergency contact`} onPress={() => call(contact, 'your emergency contact')}
            style={{ marginTop: space.sm, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }} />
        ) : null}
      </View>

      {/* Your circle */}
      <View style={styles.sectionHead}>
        <Text variant="heading">Your circle</Text>
        <Text variant="caption" color={colors.muted}>People you trust</Text>
      </View>
      <FlatList
        horizontal
        data={friends}
        keyExtractor={(f) => f.handle}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space.xl }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.lg }}
        ListHeaderComponent={
          <Pressable onPress={() => (contact ? call(contact, 'your emergency contact') : router.push('/profile'))}
            style={styles.circleItem} accessibilityRole="button" accessibilityLabel={contact ? 'Call your emergency contact' : 'Add an emergency contact'}>
            <View style={[styles.circle, contact ? styles.circleSos : styles.circleAdd]}>
              <Icon name={contact ? 'heart' : 'plus'} size={24} color={contact ? colors.onDark : colors.ink} />
            </View>
            <Text variant="caption" weight="semibold" numberOfLines={1}>{contact ? 'Emergency' : 'Add contact'}</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <View style={styles.circleItem}>
            <PersonAvatar person={item} size={64} ring />
            <Text variant="caption" weight="semibold" numberOfLines={1}>{item.firstName}</Text>
          </View>
        )}
      />
      <Button
        icon="share-2"
        label={ride ? 'Share my trip' : 'Share my trip (during a ride)'}
        variant={ride ? 'primary' : 'secondary'}
        disabled={!ride}
        onPress={shareTrip}
        style={{ marginTop: space.lg }}
      />
      {ride && (
        <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>
          Sends {ride.pickup} → {ride.dropoff} by WhatsApp, SMS or any app you choose.
        </Text>
      )}

      {/* Tips */}
      <View style={styles.sectionHead}>
        <Text variant="heading">Ride safe</Text>
      </View>
      <FlatList
        horizontal
        data={TIPS}
        keyExtractor={(t) => t.title}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space.xl }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md }}
        renderItem={({ item }) => (
          <View style={styles.tip}>
            <View style={styles.tipIcon}><Icon name={item.icon} size={20} color={colors.ink} /></View>
            <Text variant="heading" color={colors.onDark} style={{ marginTop: space.lg }}>{item.title}</Text>
            <Text color={colors.onDarkMuted} style={{ marginTop: space.xs }}>{item.text}</Text>
          </View>
        )}
      />

      {/* More */}
      <View style={styles.list}>
        {([
          ['flag', 'Report a problem', 'The Flow team answers in your notifications', () => router.push('/support')],
          ['user', 'Emergency contact', contact ?? 'Not set yet', () => router.push('/profile')],
        ] as [IconName, string, string, () => void][]).map(([icon, title, sub, onPress], i) => (
          <Pressable key={title} onPress={onPress} style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <View style={styles.rowIcon}><Icon name={icon} size={18} /></View>
            <View style={{ flex: 1 }}>
              <Text weight="semibold">{title}</Text>
              <Text variant="caption" color={colors.muted}>{sub}</Text>
            </View>
            <Icon name="chevron-right" color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, paddingTop: 56, paddingBottom: space.xxxl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  sos: { backgroundColor: colors.night, borderRadius: radius.xxl, padding: space.xl, ...shadow.float },
  sosIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  circleItem: { alignItems: 'center', gap: 6, width: 76 },
  circle: { margin: 5, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  circleSos: { backgroundColor: colors.danger },
  circleAdd: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ink3, backgroundColor: colors.surface },
  tip: { width: 220, minHeight: 180, borderRadius: radius.xxl, padding: space.lg, backgroundColor: colors.night },
  tipIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.onDark, alignItems: 'center', justifyContent: 'center' },
  list: { marginTop: space.xxl, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
