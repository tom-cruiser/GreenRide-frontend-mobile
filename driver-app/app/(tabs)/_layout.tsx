import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { colors, fonts, Icon, type IconName } from '@/design';

import { useT } from '@/i18n';

function TabIcon({ name, color }: { name: IconName; color: unknown }) {
  return <Icon name={name} size={26} color={String(color)} />;
}

// Four tabs, always visible except during a ride (the ride screen is outside
// the tabs). Big icons and labels, black on white.
export default function TabLayout() {
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 76, paddingTop: 8, paddingBottom: 12, borderTopColor: colors.line, backgroundColor: colors.surface },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 13 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <TabIcon name="navigation" color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: t('tabs.earnings'), tabBarIcon: ({ color }) => <TabIcon name="bar-chart-2" color={color} /> }} />
      <Tabs.Screen name="rides" options={{ title: t('tabs.rides'), tabBarIcon: ({ color }) => <TabIcon name="clock" color={color} /> }} />
      <Tabs.Screen name="account" options={{ title: t('tabs.account'), tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }} />
    </Tabs>
  );
}
