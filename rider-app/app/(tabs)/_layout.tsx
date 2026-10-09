import { Tabs } from 'expo-router';
import React from 'react';
import { FlowTabBar } from '@/components/flow-tab-bar';

// Floating tab bar with a sliding notch and a raised circle for the active
// tab (components/flow-tab-bar.tsx); icons per tab are set there.
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FlowTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="ride-booking" options={{ title: 'Book' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
      <Tabs.Screen name="ride-history" options={{ title: 'History' }} />
      <Tabs.Screen name="explore" options={{ title: 'More' }} />
    </Tabs>
  );
}
