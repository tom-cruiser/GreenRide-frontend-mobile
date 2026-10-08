import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { colors, fonts, Icon, type IconName } from '@/design';

function TabIcon({ name, color }: { name: IconName; color: unknown }) {
  return <Icon name={name} size={24} color={String(color)} />;
}

// Same tab bar as the driver app (shared design system), a little smaller.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 70, paddingTop: 8, paddingBottom: 12, borderTopColor: colors.line, backgroundColor: colors.surface },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="ride-booking" options={{ title: 'Book', tabBarIcon: ({ color }) => <TabIcon name="map-pin" color={color} /> }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: ({ color }) => <TabIcon name="credit-card" color={color} /> }} />
      <Tabs.Screen name="ride-history" options={{ title: 'History', tabBarIcon: ({ color }) => <TabIcon name="clock" color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'More', tabBarIcon: ({ color }) => <TabIcon name="menu" color={color} /> }} />
    </Tabs>
  );
}
