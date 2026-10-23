import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PersonAvatar } from '@/components/person-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Button, colors, Field, formatMoney, Icon, IconButton, type IconName, initials, radius, shadow, space, Text } from '@/design';
import { useT, type TKey } from '@/i18n';
import { removeProfilePhoto, socialAPI, uploadProfilePhoto } from '@/services/api';

// Profile, in the clean card style: the photo (tap the pencil to change it),
// the name, contact rows, then "My Flow" (code, friends, wallet) and account
// links. Everything shown is the rider's real data, saved to the server.

type EditField = 'name' | 'phone' | 'emergency_contact';
const LABELS: Record<EditField, TKey> = { name: 'profile.fullName', phone: 'profile.phone', emergency_contact: 'profile.emergency' };

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useT();
  const { user, token, walletBalance, updateProfile, refreshUser, logout } = useAuth();
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<EditField | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    refreshUser();
    if (token) {
      socialAPI.overview(token).then((o) => {
        setFriendsCount(o.friends.length);
        setCode(o.me.code);
      }).catch(() => {});
    }
  }, [token, refreshUser]));

  if (!user) return null;
  const me = { initials: initials(user.name), photoUrl: user.photoUrl ?? null };

  const pickPhoto = async () => {
    if (!token) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert(t('profile.photos'), t('profile.photosText'));
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadProfilePhoto(token, { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mimeType: asset.mimeType ?? 'image/jpeg' });
      await refreshUser();
    } catch (e) {
      Alert.alert(t('profile.uploadFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
    } finally {
      setUploading(false);
    }
  };

  const photoMenu = () =>
    user.photoUrl
      ? Alert.alert(t('profile.photo'), undefined, [
          { text: t('profile.newPhoto'), onPress: pickPhoto },
          { text: t('profile.removePhoto'), style: 'destructive', onPress: async () => { await removeProfilePhoto(token!).catch(() => {}); refreshUser(); } },
          { text: t('common.cancel'), style: 'cancel' },
        ])
      : pickPhoto();

  const startEdit = (field: EditField) => {
    setValue(String((field === 'emergency_contact' ? user.emergency_contact : user[field]) ?? ''));
    setEditing(field);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateProfile({ [editing]: value.trim() } as never);
      await refreshUser();
      setEditing(null);
    } catch (e) {
      Alert.alert(t('profile.saveFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Alert.alert(t('profile.copied'), t('profile.copiedText', { code }));
  };

  // [icon, label, value, placeholder when empty, field to edit]
  const rows: [IconName, string, string | null | undefined, string, EditField | null][] = [
    ['phone', t('profile.phone'), user.phone, t('profile.addPhone'), 'phone'],
    ['mail', t('profile.email'), user.email, '', null],
    ['shield', t('profile.emergency'), user.emergency_contact, t('profile.addEmergency'), 'emergency_contact'],
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="chevron-left" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
          <Text variant="heading" weight="bold">{t('profile.title')}</Text>
          <IconButton icon="settings" label={t('more.settings')} onPress={() => router.push('/settings')} />
        </View>

        {/* Photo and name */}
        <View style={styles.hero}>
          <Pressable onPress={photoMenu} accessibilityRole="button" accessibilityLabel={t('profile.changePhoto')}>
            <View style={styles.photoRing}>
              <PersonAvatar person={me} size={112} />
              {uploading && (
                <View style={styles.photoBusy}><ActivityIndicator color={colors.onDark} /></View>
              )}
            </View>
            <View style={styles.pencil}><Icon name="edit-2" size={14} color={colors.onDark} /></View>
          </Pressable>
          <Pressable onPress={() => startEdit('name')} accessibilityRole="button" accessibilityLabel={t('profile.editName')}>
            <Text variant="title" style={{ marginTop: space.lg }}>{user.name}</Text>
          </Pressable>
        </View>

        {/* Contact rows */}
        <View style={styles.group}>
          {rows.map(([icon, label, val, empty, field], i) => (
            <Pressable key={label} onPress={field ? () => startEdit(field) : undefined} disabled={!field}
              style={({ pressed }) => [styles.infoRow, i > 0 && styles.infoRowLine, pressed && { opacity: 0.7 }]}
              accessibilityRole={field ? 'button' : undefined}>
              <View style={styles.infoIcon}><Icon name={icon} size={18} /></View>
              <View style={{ flex: 1 }}>
                <Text variant="overline" color={colors.muted}>{label}</Text>
                <Text weight="medium" numberOfLines={1} color={val ? colors.ink : colors.muted}>{val || empty}</Text>
              </View>
              {field && <Icon name="chevron-right" size={18} color={colors.muted} />}
            </Pressable>
          ))}
        </View>

        {/* My Flow */}
        <Pressable style={styles.sectionHead} onPress={() => router.push('/join')} accessibilityRole="button">
          <Text variant="heading" weight="bold">{t('profile.myFlow')}</Text>
          <Icon name="chevron-right" color={colors.muted} />
        </Pressable>
        <View style={styles.tiles}>
          <Tile icon="hash" title={t('profile.code')} sub={code ?? '…'} onPress={copyCode} />
          <Tile icon="users" title={t('profile.friends')} sub={friendsCount == null ? '…' : String(friendsCount)} onPress={() => router.push('/join')} />
          <Tile icon="credit-card" title={t('wallet.title')} sub={formatMoney(Number(walletBalance ?? 0))} onPress={() => router.push('/(tabs)/wallet')} />
        </View>

        {/* Account */}
        <Text variant="heading" weight="bold" style={{ marginTop: space.xxl, marginBottom: space.md }}>{t('settings.account')}</Text>
        <View style={styles.group}>
          {([
            ['clock', t('profile.history'), () => router.push('/(tabs)/ride-history')],
            ['help-circle', t('profile.help'), () => router.push('/support')],
            ['log-out', t('profile.logout'), () => Alert.alert(t('profile.logoutTitle'), undefined, [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('profile.logout'), style: 'destructive', onPress: logout },
            ])],
          ] as [IconName, string, () => void][]).map(([icon, label, onPress], i) => {
            const danger = icon === 'log-out';
            return (
            <Pressable key={label} onPress={onPress} style={({ pressed }) => [styles.infoRow, i > 0 && styles.infoRowLine, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <View style={styles.infoIcon}><Icon name={icon} size={18} color={danger ? colors.danger : colors.ink} /></View>
              <Text weight="medium" style={{ flex: 1 }} color={danger ? colors.danger : colors.ink}>{label}</Text>
              <Icon name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit one field */}
      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable style={styles.overlay} onPress={() => setEditing(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {editing && (
              <View style={{ gap: space.lg }}>
                <Text variant="title">{t(LABELS[editing])}</Text>
                <Field label={t(LABELS[editing])} value={value} onChangeText={setValue} autoFocus
                  keyboardType={editing === 'name' ? 'default' : 'phone-pad'}
                  hint={editing === 'name' ? undefined : t('profile.phoneHint')} />
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

function Tile({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.infoIcon}><Icon name={icon} size={18} /></View>
      <Text weight="semibold" style={{ marginTop: space.md }}>{title}</Text>
      <Text variant="caption" color={colors.muted} numberOfLines={1}>{sub}</Text>
    </Pressable>
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
