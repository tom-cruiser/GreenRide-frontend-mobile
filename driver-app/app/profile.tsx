import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DriverAvatar } from '@/components/driver-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverWork } from '@/contexts/DriverWorkContext';
import { Badge, Button, colors, Field, Icon, IconButton, type IconName, radius, shadow, space, Text } from '@/design';
import { useT } from '@/i18n';
import { driversAPI, removeProfilePhoto, uploadProfilePhoto } from '@/services/api';

// Profile, in the same clean card style as the rider app: the photo (tap the
// pencil to change it), the name and approval, contact rows, then "Your work"
// (rating, trips, acceptance) and account links. All real data from the server.

type EditField = 'name' | 'phone';
type Stats = { rating: { average: number | null; count: number }; trips: { month: number }; acceptanceRate: number | null };

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useT();
  const { user, token, updateProfile, refreshUser, logout } = useAuth();
  const { approval } = useDriverWork();
  const [stats, setStats] = useState<Stats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<EditField | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    refreshUser();
    if (token) driversAPI.getStats(token).then(setStats).catch(() => {});
  }, [token, refreshUser]));

  if (!user) return null;

  const badge = {
    verified: { label: t('account.approved'), tone: 'dark' as const, icon: 'check-circle' as const },
    pending: { label: t('account.pending'), tone: 'warning' as const, icon: 'clock' as const },
    rejected: { label: t('account.rejected'), tone: 'danger' as const, icon: 'alert-circle' as const },
    not_onboarded: { label: t('account.notOnboarded'), tone: 'neutral' as const, icon: 'file-plus' as const },
  }[approval as 'verified' | 'pending' | 'rejected' | 'not_onboarded'];

  const pickPhoto = async () => {
    if (!token) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert(t('profile.photo'), t('profile.photoAccess'));
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadProfilePhoto(token, { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mimeType: asset.mimeType ?? 'image/jpeg' });
      await refreshUser();
    } catch (e) {
      Alert.alert(t('profile.uploadFailed'), e instanceof Error ? e.message : t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const photoMenu = () =>
    user.photoUrl
      ? Alert.alert(t('profile.photo'), undefined, [
          { text: t('profile.choosePhoto'), onPress: pickPhoto },
          { text: t('profile.removePhoto'), style: 'destructive', onPress: async () => { await removeProfilePhoto(token!).catch(() => {}); refreshUser(); } },
          { text: t('common.cancel'), style: 'cancel' },
        ])
      : pickPhoto();

  const startEdit = (field: EditField) => {
    setValue(String(user[field] ?? ''));
    setEditing(field);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateProfile({ [editing]: value.trim() });
      await refreshUser();
      setEditing(null);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const rows: [IconName, string, string, EditField | null][] = [
    ['phone', t('profile.phone'), user.phone || t('profile.addPhone'), 'phone'],
    ['mail', t('profile.email'), user.email, null],
  ];

  const rating = stats?.rating.average;
  const links: [IconName, string, () => void, boolean?][] = [
    ['truck', t('account.car'), () => router.push('/car')],
    ['file-text', t('account.documents'), () => router.push('/documents')],
    ['help-circle', t('account.help'), () => router.push('/help')],
    ['log-out', t('account.logout'), () => Alert.alert(t('account.logoutTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.logout'), style: 'destructive', onPress: logout },
    ]), true],
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="chevron-left" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/account'))} />
          <Text variant="heading" weight="bold">{t('profile.title')}</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Photo, name and approval */}
        <View style={styles.hero}>
          <Pressable onPress={photoMenu} accessibilityRole="button" accessibilityLabel={t('profile.changePhoto')}>
            <View style={styles.photoRing}>
              <DriverAvatar name={user.name} photoUrl={user.photoUrl} size={112} />
              {uploading && (
                <View style={styles.photoBusy}><ActivityIndicator color={colors.onDark} /></View>
              )}
            </View>
            <View style={styles.pencil}><Icon name="edit-2" size={14} color={colors.onDark} /></View>
          </Pressable>
          <Pressable onPress={() => startEdit('name')} accessibilityRole="button" accessibilityLabel={t('profile.editName')}>
            <Text variant="title" style={{ marginTop: space.lg }}>{user.name}</Text>
          </Pressable>
          {badge && <View style={{ marginTop: space.sm }}><Badge {...badge} /></View>}
          {!user.photoUrl && (
            <Text variant="caption" color={colors.muted} align="center" style={{ marginTop: space.sm }}>{t('profile.photoHint')}</Text>
          )}
        </View>

        {/* Contact rows */}
        <View style={styles.group}>
          {rows.map(([icon, label, val, field], i) => (
            <Pressable key={label} onPress={field ? () => startEdit(field) : undefined} disabled={!field}
              style={({ pressed }) => [styles.infoRow, i > 0 && styles.infoRowLine, pressed && { opacity: 0.7 }]}
              accessibilityRole={field ? 'button' : undefined}>
              <View style={styles.infoIcon}><Icon name={icon} size={18} /></View>
              <View style={{ flex: 1 }}>
                <Text variant="overline" color={colors.muted}>{label}</Text>
                <Text weight="medium" numberOfLines={1} color={field && !user[field] ? colors.muted : colors.ink}>{val}</Text>
              </View>
              {field && <Icon name="chevron-right" size={18} color={colors.muted} />}
            </Pressable>
          ))}
        </View>

        {/* Your work */}
        <Pressable style={styles.sectionHead} onPress={() => router.push('/(tabs)/earnings')} accessibilityRole="button">
          <Text variant="heading" weight="bold">{t('profile.yourWork')}</Text>
          <Icon name="chevron-right" color={colors.muted} />
        </Pressable>
        <View style={styles.tiles}>
          <Tile icon="star" title={t('profile.rating')}
            sub={stats == null ? '…' : rating ? `${rating.toFixed(1)} ★ (${stats.rating.count})` : t('profile.noRating')} />
          <Tile icon="navigation" title={t('profile.tripsMonth')} sub={stats == null ? '…' : String(stats.trips.month)} />
          <Tile icon="check-circle" title={t('profile.acceptance')}
            sub={stats == null ? '…' : stats.acceptanceRate == null ? '—' : `${stats.acceptanceRate}%`} />
        </View>

        {/* Account */}
        <Text variant="heading" weight="bold" style={{ marginTop: space.xxl, marginBottom: space.md }}>{t('profile.account')}</Text>
        <View style={styles.group}>
          {links.map(([icon, label, onPress, danger], i) => (
            <Pressable key={label} onPress={onPress} style={({ pressed }) => [styles.infoRow, i > 0 && styles.infoRowLine, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <View style={styles.infoIcon}><Icon name={icon} size={18} color={danger ? colors.danger : colors.ink} /></View>
              <Text weight="medium" style={{ flex: 1 }} color={danger ? colors.danger : colors.ink}>{label}</Text>
              <Icon name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Edit one field */}
      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlay} onPress={() => setEditing(null)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              {editing && (
                <View style={{ gap: space.lg }}>
                  <Text variant="title">{t(`profile.${editing}`)}</Text>
                  <Field label={t(`profile.${editing}`)} value={value} onChangeText={setValue} autoFocus
                    keyboardType={editing === 'name' ? 'default' : 'phone-pad'}
                    autoComplete={editing === 'name' ? 'name' : 'tel'}
                    hint={editing === 'name' ? undefined : t('auth.phoneHint')} />
                  <Button label={t('common.save')} onPress={save} loading={saving} disabled={!value.trim()} />
                  <Button label={t('common.cancel')} variant="ghost" onPress={() => setEditing(null)} />
                </View>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Tile({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${title}: ${sub}`}>
      <View style={styles.infoIcon}><Icon name={icon} size={18} /></View>
      <Text weight="bold" style={{ marginTop: space.md }} numberOfLines={1} adjustsFontSizeToFit>{sub}</Text>
      <Text variant="caption" color={colors.muted} numberOfLines={2}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, paddingBottom: space.xxxl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: space.xl, marginBottom: space.xxl },
  photoRing: { padding: 4, borderRadius: 64, backgroundColor: colors.surface, ...shadow.card },
  photoBusy: {
    position: 'absolute', top: 4, left: 4, width: 112, height: 112, borderRadius: 56,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  pencil: {
    position: 'absolute', right: 2, bottom: 6, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink,
    borderWidth: 3, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  group: { backgroundColor: colors.bg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  infoRowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  infoIcon: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.xxl, ...shadow.float },
});
