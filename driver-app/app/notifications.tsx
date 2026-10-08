import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverWork } from '@/contexts/DriverWorkContext';
import { Button, Card, colors, EmptyState, formatDateTime, Header, Icon, space, Text } from '@/design';
import { useT } from '@/i18n';
import { notificationsAPI } from '@/services/api';

type Note = { id: number; message: string; read_at: string | null; created_at: string };

export default function NotificationsScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { token } = useAuth();
  const { refreshUnread } = useDriverWork();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const { notifications } = await notificationsAPI.getNotifications(token).catch(() => ({ notifications: [] }));
    setNotes(notifications ?? []);
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const read = async (id: number) => {
    if (!token) return;
    await notificationsAPI.markAsRead(token, id).catch(() => {});
    setNotes((list) => list?.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)) ?? null);
    refreshUnread();
  };
  const readAll = async () => {
    if (!token) return;
    await notificationsAPI.markAllAsRead(token).catch(() => {});
    await load();
    refreshUnread();
  };
  const unread = (notes ?? []).filter((n) => !n.read_at).length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={notes ?? []}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxxl * 2, gap: space.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View>
            <Header title={t('notifications.title')} onBack={() => router.back()} backLabel={t('common.back')} />
            {unread > 0 && <Button size="md" variant="secondary" label={t('notifications.markAll')} onPress={readAll} style={{ marginBottom: space.md }} />}
          </View>
        }
        ListEmptyComponent={notes ? <EmptyState icon="bell" title={t('notifications.none')} /> : null}
        renderItem={({ item }) => (
          <Card onPress={item.read_at ? undefined : () => read(item.id)}
            style={[{ flexDirection: 'row', gap: space.md }, !item.read_at && { borderColor: colors.ink, borderWidth: 1.5 }]}>
            <Icon name="bell" size={20} color={item.read_at ? colors.muted : colors.ink} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text weight={item.read_at ? 'regular' : 'semibold'}>{item.message}</Text>
              <Text variant="caption" color={colors.muted}>{formatDateTime(item.created_at, locale)}</Text>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
