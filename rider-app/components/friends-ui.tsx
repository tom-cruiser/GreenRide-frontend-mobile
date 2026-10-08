import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { signalingClient } from '../services/signalingClient';
import { isInsufficientBalance, type FriendsPerson } from '../services/api';

type Router = ReturnType<typeof useRouter>;

// Shared pieces for the "share with friends" screens, in the app's usual
// green-on-white style (same as the active-ride screen).

export const ACCENT = '#111111';

export const money = (amount: number, currency = 'FBU') => `${amount.toLocaleString()} ${currency}`;

// Riders see each other's first name and initials only (photos come later).
export function Avatar({ person, size = 44 }: { person: FriendsPerson; size?: number }) {
  return (
    <View style={[ui.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[ui.avatarText, { fontSize: size * 0.38 }]}>{person.initials}</Text>
    </View>
  );
}

const CHIP: Record<string, [string, string, string]> = {
  invited: ['Invited', '#fef3c7', '#92400e'],
  accepted: ['Joined', '#F3F4F6', '#111111'],
  declined: ['Declined', '#f3f4f6', '#4b5563'],
  expired: ['Expired', '#f3f4f6', '#4b5563'],
  removed: ['Removed', '#fee2e2', '#991b1b'],
  left: ['Left', '#f3f4f6', '#4b5563'],
};
export function StatusChip({ status }: { status: string }) {
  const [label, bg, fg] = CHIP[status] ?? [status, '#f3f4f6', '#4b5563'];
  return (
    <View style={[ui.chip, { backgroundColor: bg }]}>
      <Text style={[ui.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// "8:42" until the time runs out, then null.
export function useCountdown(until: string | null | undefined): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!until) return null;
  const left = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  if (left === 0) return null;
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

// Reloads when the server says the group changed (Socket.io), and every few
// seconds as a fallback, while the screen is visible.
export function useLiveGroup(groupId: number | string | undefined, reload: () => void, everyMs = 8000) {
  useFocusEffect(
    React.useCallback(() => {
      reload();
      const off = signalingClient.on('friends:updated', (msg: { groupId?: number }) => {
        if (!groupId || String(msg?.groupId) === String(groupId)) reload();
      });
      const timer = setInterval(reload, everyMs);
      return () => {
        off();
        clearInterval(timer);
      };
    }, [groupId, reload, everyMs]),
  );
}

// Explains a failed action; "not enough balance" offers a top-up.
export function showError(router: Router, title: string, e: unknown) {
  if (isInsufficientBalance(e)) {
    const { price, balance, missing } = e.details;
    Alert.alert(
      'Not enough balance',
      `This ride costs ${money(price)}. You have ${money(balance)}, so you need ${money(missing)} more.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Top up', onPress: () => router.push('/(tabs)/wallet') },
      ],
    );
    return;
  }
  Alert.alert(title, e instanceof Error ? e.message : 'Please try again.');
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={ui.row}>
      <Text style={ui.rowLabel}>{label}</Text>
      <Text style={ui.rowValue}>{value}</Text>
    </View>
  );
}

export function BackButton({ onPress, label = '< Home' }: { onPress: () => void; label?: string }) {
  return (
    <TouchableOpacity style={ui.goBack} onPress={onPress}>
      <Text style={ui.goBackText}>{label}</Text>
    </TouchableOpacity>
  );
}

export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7F7F7' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  goBack: { alignSelf: 'flex-start', marginBottom: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F6F6F6' },
  goBackText: { color: '#0B0B0B', fontWeight: '700', fontSize: 15 },
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#0B0B0B', textAlign: 'center' },
  detail: { color: '#4b5563', textAlign: 'center', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  hint: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  rowLabel: { color: '#6b7280' },
  rowValue: { color: '#111827', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  price: { fontSize: 28, fontWeight: '800', color: '#0B0B0B', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: '#0f172a', backgroundColor: '#fff', fontSize: 16 },
  primaryBtn: { backgroundColor: ACCENT, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', marginTop: 8 },
  secondaryBtnText: { color: '#111111', fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff', marginTop: 8 },
  cancelText: { color: '#b91c1c', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
  avatar: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#111111', fontWeight: '800' },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },
});
