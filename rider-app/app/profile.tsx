import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PersonAvatar } from '@/components/person-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Button, colors, Field, formatMoney, Icon, IconButton, type IconName, initials, radius, shadow, space, Text } from '@/design';
import { removeProfilePhoto, socialAPI, uploadProfilePhoto } from '@/services/api';

// Profile, in the clean card style: the photo (tap the pencil to change it),
// the name, contact rows, then "My Flow" (code, friends, wallet) and account
// links. Everything shown is the rider's real data, saved to the server.

type EditField = 'name' | 'phone' | 'emergency_contact';
const LABELS: Record<EditField, string> = { name: 'Full name', phone: 'Phone', emergency_contact: 'Emergency contact' };

export default function ProfileScreen() {
  const router = useRouter();
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
    if (!permission.granted) return Alert.alert('Photos', 'Allow access to your photos to add a profile picture.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadProfilePhoto(token, { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mimeType: asset.mimeType ?? 'image/jpeg' });
      await refreshUser();
    } catch (e) {
      Alert.alert('Could not upload', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const photoMenu = () =>
    user.photoUrl
      ? Alert.alert('Profile photo', undefined, [
          { text: 'Choose a new photo', onPress: pickPhoto },
          { text: 'Remove photo', style: 'destructive', onPress: async () => { await removeProfilePhoto(token!).catch(() => {}); refreshUser(); } },
          { text: 'Cancel', style: 'cancel' },
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
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', `${code} is ready to paste.`);
  };

  const rows: [IconName, string, string, EditField | null][] = [
    ['phone', 'Phone', user.phone || 'Add your number', 'phone'],
    ['mail', 'Email', user.email, null],
    ['shield', 'Emergency contact', user.emergency_contact || 'Add someone to call', 'emergency_contact'],
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="chevron-left" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
          <Text variant="heading" weight="bold">Profile</Text>
          <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        </View>

        {/* Photo and name */}
        <View style={styles.hero}>
          <Pressable onPress={photoMenu} accessibilityRole="button" accessibilityLabel="Change profile photo">
            <View style={styles.photoRing}>
              <PersonAvatar person={me} size={112} />
              {uploading && (
                <View style={styles.photoBusy}><ActivityIndicator color={colors.onDark} /></View>
              )}
            </View>
            <View style={styles.pencil}><Icon name="edit-2" size={14} color={colors.onDark} /></View>
          </Pressable>
          <Pressable onPress={() => startEdit('name')} accessibilityRole="button" accessibilityLabel="Edit your name">
            <Text variant="title" style={{ marginTop: space.lg }}>{user.name}</Text>
          </Pressable>
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
                <Text weight="medium" numberOfLines={1} color={val.startsWith('Add ') ? colors.muted : colors.ink}>{val}</Text>
              </View>
              {field && <Icon name="chevron-right" size={18} color={colors.muted} />}
            </Pressable>
          ))}
        </View>

        {/* My Flow */}
        <Pressable style={styles.sectionHead} onPress={() => router.push('/join')} accessibilityRole="button">
          <Text variant="heading" weight="bold">My Flow</Text>
          <Icon name="chevron-right" color={colors.muted} />
        </Pressable>
        <View style={styles.tiles}>
          <Tile icon="hash" title="Flow code" sub={code ?? '…'} onPress={copyCode} />
          <Tile icon="users" title="Friends" sub={friendsCount == null ? '…' : String(friendsCount)} onPress={() => router.push('/join')} />
          <Tile icon="credit-card" title="Wallet" sub={formatMoney(Number(walletBalance ?? 0))} onPress={() => router.push('/(tabs)/wallet')} />
        </View>

        {/* Account */}
        <Text variant="heading" weight="bold" style={{ marginTop: space.xxl, marginBottom: space.md }}>Account</Text>
        <View style={styles.group}>
          {([
            ['clock', 'Ride history', () => router.push('/(tabs)/ride-history')],
            ['help-circle', 'Help & support', () => router.push('/support')],
            ['log-out', 'Log out', () => Alert.alert('Log out?', undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', style: 'destructive', onPress: logout },
            ])],
          ] as [IconName, string, () => void][]).map(([icon, label, onPress], i) => (
            <Pressable key={label} onPress={onPress} style={({ pressed }) => [styles.infoRow, i > 0 && styles.infoRowLine, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <View style={styles.infoIcon}><Icon name={icon} size={18} color={label === 'Log out' ? colors.danger : colors.ink} /></View>
              <Text weight="medium" style={{ flex: 1 }} color={label === 'Log out' ? colors.danger : colors.ink}>{label}</Text>
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
                <Text variant="title">{LABELS[editing]}</Text>
                <Field label={LABELS[editing]} value={value} onChangeText={setValue} autoFocus
                  keyboardType={editing === 'name' ? 'default' : 'phone-pad'}
                  hint={editing === 'name' ? undefined : 'With the country code, for example +257 79 12 34 56'} />
                <Button label="Save" onPress={save} loading={saving} disabled={!value.trim()} />
                <Button label="Cancel" variant="ghost" onPress={() => setEditing(null)} />
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
