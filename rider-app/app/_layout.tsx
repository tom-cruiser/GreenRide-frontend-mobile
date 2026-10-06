import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CallProvider } from '@/contexts/CallContext';
import { IncomingCallOverlay } from '@/components/IncomingCallOverlay';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { user, token, isLoading } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('riderHasOnboarded')
      .then((value) => setHasOnboarded(value === 'true'))
      .catch(() => setHasOnboarded(false));
  }, []);

  const bootstrapping = isLoading || hasOnboarded === null;

  useEffect(() => {
    if (bootstrapping) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [bootstrapping]);

  useEffect(() => {
    if (bootstrapping) return;

    const first = segments[0];
    const inAuthGroup = first === '(auth)';
    const onOnboarding = first === 'onboarding';
    const isAuthed = !!user && !!token;

    if (!hasOnboarded) {
      // The onboarding screen saves the flag and then navigates away, so
      // re-read it before sending the user back to onboarding.
      if (!onOnboarding) {
        AsyncStorage.getItem('riderHasOnboarded')
          .then((value) => {
            if (value === 'true') setHasOnboarded(true);
            else router.replace('/onboarding');
          })
          .catch(() => router.replace('/onboarding'));
      }
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

  // Always mounted so the navigator isn't rebuilt on login; with no user it
  // stays idle and doesn't connect to call signaling.
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
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="profile" options={{ headerShown: false, title: 'Profile' }} />
          <Stack.Screen name="safety" options={{ headerShown: false, title: 'Safety & Support' }} />
          <Stack.Screen name="support" options={{ headerShown: false, title: 'Help & Support' }} />
          <Stack.Screen name="promotions" options={{ headerShown: false, title: 'Promotions' }} />
          <Stack.Screen name="settings" options={{ headerShown: false, title: 'Settings' }} />
          <Stack.Screen name="messaging" options={{ headerShown: false, title: 'Messages' }} />
          <Stack.Screen name="active-ride" options={{ headerShown: false }} />
          <Stack.Screen name="call" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
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
      <RootNavigator />
    </AuthProvider>
  );
}
