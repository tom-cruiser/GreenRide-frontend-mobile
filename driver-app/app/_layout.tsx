import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CallProvider } from '@/contexts/CallContext';
import { IncomingCallOverlay } from '@/components/IncomingCallOverlay';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppStack() {
  const colorScheme = useColorScheme();
  const { user, token } = useAuth();

  const stack = (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="onboarding">
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="registration-verification" options={{ title: 'Registration & Verification' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile Management' }} />
        <Stack.Screen name="messaging" options={{ title: 'In-App Messaging' }} />
        <Stack.Screen name="safety" options={{ title: 'Safety Center' }} />
        <Stack.Screen name="support" options={{ title: 'Support & Help' }} />
        <Stack.Screen name="feedback-ratings" options={{ title: 'Feedback & Ratings' }} />
        <Stack.Screen name="shared-rides" options={{ title: 'Shared Rides' }} />
        <Stack.Screen name="promotions" options={{ title: 'Promotions' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="wallet" options={{ title: 'Wallet' }} />
        <Stack.Screen name="ride-requests" options={{ title: 'Ride Requests' }} />
        <Stack.Screen name="ride-history" options={{ title: 'Ride History' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen
          name="call"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );

  if (!user || !token) return stack;

  return (
    <CallProvider userId={user.id} displayName={user.name} authToken={token}>
      {stack}
      <IncomingCallOverlay />
    </CallProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppStack />
    </AuthProvider>
  );
}
