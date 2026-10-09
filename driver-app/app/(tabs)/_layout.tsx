import { Tabs } from 'expo-router';
import React from 'react';
import { FlowTabBar } from '@/components/flow-tab-bar';
import { useT } from '@/i18n';

// Four tabs, always visible except during a ride (the ride screen is outside
// the tabs). The floating bar with the raised circle, as in the rider app.
export default function TabLayout() {
  const { t } = useT();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FlowTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="earnings" options={{ title: t('tabs.earnings') }} />
      <Tabs.Screen name="rides" options={{ title: t('tabs.rides') }} />
      <Tabs.Screen name="account" options={{ title: t('tabs.account') }} />
    </Tabs>
  );
}
