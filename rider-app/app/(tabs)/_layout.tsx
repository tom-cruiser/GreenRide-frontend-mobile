import { Tabs } from 'expo-router';
import React from 'react';
import { FlowTabBar } from '@/components/flow-tab-bar';
import { useT } from '@/i18n';

// Floating tab bar with a sliding notch and a raised circle for the active
// tab (components/flow-tab-bar.tsx); icons per tab are set there.
export default function TabLayout() {
  const { t } = useT();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FlowTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="ride-booking" options={{ title: t('tabs.book') }} />
      <Tabs.Screen name="wallet" options={{ title: t('tabs.wallet') }} />
      <Tabs.Screen name="ride-history" options={{ title: t('tabs.history') }} />
      <Tabs.Screen name="explore" options={{ title: t('tabs.more') }} />
    </Tabs>
  );
}
