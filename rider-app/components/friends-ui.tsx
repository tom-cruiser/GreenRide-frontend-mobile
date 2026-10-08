import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Avatar as DesignAvatar, Badge, colors, IconButton, radius, shadow, space, formatMoney } from '@/design';
import { useFocusEffect, useRouter } from 'expo-router';
import { signalingClient } from '../services/signalingClient';
import { isInsufficientBalance, type FriendsPerson } from '../services/api';

type Router = ReturnType<typeof useRouter>;

// Shared pieces for the "share with friends" screens, in the app's usual
// black-and-white Flow style, built on the shared design system.

export const ACCENT = colors.ink;

export const money = (amount: number, currency = 'FBU') => formatMoney(amount, currency);

// Riders see each other's first name and initials only (photos come later).
export function Avatar({ person, size = 44 }: { person: FriendsPerson; size?: number }) {
  return <DesignAvatar name={person.initials.split('').join(' ')} size={size} />;
}

const CHIP: Record<string, [string, 'neutral' | 'dark' | 'warning' | 'danger']> = {
  invited: ['Invited', 'warning'],
  accepted: ['Joined', 'dark'],
  declined: ['Declined', 'neutral'],
  expired: ['Expired', 'neutral'],
  removed: ['Removed', 'danger'],
  left: ['Left', 'neutral'],
};
export function StatusChip({ status }: { status: string }) {
  const [label, tone] = CHIP[status] ?? [status, 'neutral'];
  return <Badge label={label} tone={tone} />;
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

export { Row } from '@/design';

export function BackButton({ onPress, label = 'Home' }: { onPress: () => void; label?: string }) {
  return (
    <View style={{ marginBottom: space.md, alignSelf: 'flex-start' }}>
      <IconButton icon="chevron-left" label={label} onPress={onPress} />
    </View>
  );
}

export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  container: { padding: space.xl, paddingTop: 56, paddingBottom: 40 },
  statusCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.xl, marginBottom: space.md, borderWidth: 1, borderColor: colors.line, alignItems: 'center', ...shadow.card },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink, textAlign: 'center', letterSpacing: -0.4 },
  detail: { color: colors.ink3, textAlign: 'center', marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, marginBottom: space.md, borderWidth: 1, borderColor: colors.line, ...shadow.card },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  hint: { color: colors.muted, fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  rowLabel: { color: colors.ink3 },
  rowValue: { color: colors.ink, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  price: { fontSize: 32, fontWeight: '800', color: colors.ink, marginTop: 4, letterSpacing: -0.8 },
  input: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, color: colors.ink, backgroundColor: colors.surface, fontSize: 16 },
  primaryBtn: { backgroundColor: colors.ink, height: 54, paddingHorizontal: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryBtnText: { color: colors.onDark, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, marginTop: 8 },
  secondaryBtnText: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  cancelBtn: { height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: colors.surface, marginTop: 8 },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
