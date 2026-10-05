import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
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
  const router = useRouter();
  const segments = useSegments();
  const { user, token, isLoading } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('driverHasOnboarded')
      .then((value) => setHasOnboarded(value === 'true'))
      .catch(() => setHasOnboarded(false));
  }, []);

  const bootstrapping = isLoading || hasOnboarded === null;

  // Route guard: onboarding once, then sign-in before anything else.
  useEffect(() => {
    if (bootstrapping) return;

    const first = segments[0];
    const inAuthGroup = first === '(auth)';
    const onOnboarding = first === 'onboarding';
    const isAuthed = !!user && !!token;

    if (!hasOnboarded) {
      if (!onOnboarding) router.replace('/onboarding');
      return;
    }

    if (!isAuthed && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (isAuthed && (inAuthGroup || onOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [bootstrapping, hasOnboarded, user, token, segments, router]);

  if (bootstrapping) return null;

  // CallProvider is always mounted so the navigator isn't rebuilt on login;
  // with no user it stays idle and doesn't connect to call signaling.
  return (
    <CallProvider
      userId={user && token ? String(user.id) : ''}
      displayName={user?.name ?? ''}
      authToken={token ?? ''}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
          <Stack.Screen name="active-ride" options={{ title: 'Current Ride' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen
            name="call"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
        </Stack>
        <StatusBar style="auto" />
        <IncomingCallOverlay />
      </ThemeProvider>
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
