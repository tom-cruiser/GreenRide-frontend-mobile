import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { PersonAvatar } from '@/components/person-avatar';
import { EMERGENCY } from '@/config/safety';
import { useAuth } from '@/contexts/AuthContext';
import { Button, colors, firstName, Icon, IconButton, type IconName, radius, shadow, space, Text } from '@/design';
import { useT, type TKey } from '@/i18n';
import { ridesAPI, socialAPI, type SocialPerson } from '@/services/api';

// Safety, in the same style as "Join a ride": help first (emergency call,
// your emergency contact), your circle with "Share my trip", tips as cards,
// and reporting a problem to the Flow team.

type ActiveRide = { id: number; status: string; pickup: string; dropoff: string; driver_name: string | null };

const TIPS: { icon: IconName; title: TKey; text: TKey }[] = [
  { icon: 'eye', title: 'safety.tip1', text: 'safety.tip1Text' },
  { icon: 'share-2', title: 'safety.tip2', text: 'safety.tip2Text' },
  { icon: 'user', title: 'safety.tip3', text: 'safety.tip3Text' },
  { icon: 'alert-triangle', title: 'safety.tip4', text: 'safety.tip4Text' },
];

export default function SafetyScreen() {
  const router = useRouter();
  const { t, locale } = useT();
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
    Alert.alert(t('safety.callWho', { who }), number, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('safety.call'), style: 'destructive', onPress: () => Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`).catch(() => {}) },
    ]);

  const shareTrip = () => {
    if (!ride) return;
    const driver = firstName(ride.driver_name);
    const lines = [
      t('safety.shareLine', { from: ride.pickup, to: ride.dropoff }),
      driver ? t('safety.shareDriver', { name: driver }) : t('safety.shareOnWay'),
      `${user?.name ? firstName(user.name) : t('safety.me')} · ${new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`,
    ];
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="chevron-left" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <Text variant="title" style={{ flex: 1 }}>{t('home.safety')}</Text>
        <IconButton icon="phone" label={t('safety.callWho', { who: t('safety.services') })} onPress={() => call(EMERGENCY.number, t('safety.services'))} />
      </View>

      {/* Help, first */}
      <View style={styles.sos}>
        <View style={styles.sosIcon}><Icon name="alert-octagon" size={26} color={colors.onDark} /></View>
        <Text variant="title" color={colors.onDark} style={{ marginTop: space.md }}>{t('safety.danger')}</Text>
        <Text color={colors.onDarkMuted} style={{ marginTop: 2 }}>{t('safety.dangerText')}</Text>
        <Button size="lg" variant="light" icon="phone" label={t('safety.callNumber', { number: EMERGENCY.number })} onPress={() => call(EMERGENCY.number, t('safety.services'))}
          style={{ marginTop: space.lg }} />
        {contact ? (
          <Button size="lg" variant="ghostDark" icon="heart" label={t('safety.callContact')} onPress={() => call(contact, t('safety.yourContact'))}
            style={{ marginTop: space.sm, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }} />
        ) : null}
      </View>

      {/* Your circle */}
      <View style={styles.sectionHead}>
        <Text variant="heading">{t('safety.circle')}</Text>
        <Text variant="caption" color={colors.muted}>{t('safety.circleText')}</Text>
      </View>
      <FlatList
        horizontal
        data={friends}
        keyExtractor={(f) => f.handle}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space.xl }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.lg }}
        ListHeaderComponent={
          <Pressable onPress={() => (contact ? call(contact, t('safety.yourContact')) : router.push('/profile'))}
            style={styles.circleItem} accessibilityRole="button" accessibilityLabel={contact ? t('safety.callContact') : t('safety.addContactLong')}>
            <View style={[styles.circle, contact ? styles.circleSos : styles.circleAdd]}>
              <Icon name={contact ? 'heart' : 'plus'} size={24} color={contact ? colors.onDark : colors.ink} />
            </View>
            <Text variant="caption" weight="semibold" numberOfLines={1}>{contact ? t('safety.emergency') : t('safety.addContact')}</Text>
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
        label={ride ? t('safety.share') : t('safety.shareLater')}
        variant={ride ? 'primary' : 'secondary'}
        disabled={!ride}
        onPress={shareTrip}
        style={{ marginTop: space.lg }}
      />
      {ride && (
        <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>
          {t('safety.shareHint', { from: ride.pickup, to: ride.dropoff })}
        </Text>
      )}

      {/* Tips */}
      <View style={styles.sectionHead}>
        <Text variant="heading">{t('safety.rideSafe')}</Text>
      </View>
      <FlatList
        horizontal
        data={TIPS}
        keyExtractor={(tip) => tip.title}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space.xl }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md }}
        renderItem={({ item }) => (
          <View style={styles.tip}>
            <View style={styles.tipIcon}><Icon name={item.icon} size={20} color={colors.ink} /></View>
            <Text variant="heading" color={colors.onDark} style={{ marginTop: space.lg }}>{t(item.title)}</Text>
            <Text color={colors.onDarkMuted} style={{ marginTop: space.xs }}>{t(item.text)}</Text>
          </View>
        )}
      />

      {/* More */}
      <View style={styles.list}>
        {([
          ['flag', t('safety.report'), t('safety.reportText'), () => router.push('/support')],
          ['user', t('profile.emergency'), contact ?? t('safety.notSet'), () => router.push('/profile')],
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
