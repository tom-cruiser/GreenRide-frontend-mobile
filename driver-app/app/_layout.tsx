import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { IncomingCallOverlay } from '@/components/IncomingCallOverlay';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CallProvider } from '@/contexts/CallContext';
import { DriverAvailabilityProvider } from '@/contexts/DriverAvailabilityContext';
import { DriverWorkProvider, useDriverWork } from '@/contexts/DriverWorkContext';
import { colors, DesignProvider, useFlowFonts } from '@/design';
import { I18nProvider } from '@/i18n';

export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync().catch(() => {});

// Light, high-contrast theme for the navigator (screen backgrounds).
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, text: colors.ink, primary: colors.ink } };

// Screens a ride in progress may show; anything else is replaced by the ride.
const DURING_RIDE = ['ride', 'call'];

function Guard() {
  const router = useRouter();
  const segments = useSegments();
  const { user, token, isLoading } = useAuth();
  const { activeRide } = useDriverWork();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('driverHasOnboarded')
      .then((value) => setHasOnboarded(value === 'true'))
      .catch(() => setHasOnboarded(false));
  }, []);

  const ready = !isLoading && hasOnboarded !== null;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const first = segments[0] as string | undefined;
    const isAuthed = Boolean(user && token);

    if (!hasOnboarded) {
      // The onboarding screen saves the flag, then navigates away.
      if (first !== 'onboarding') {
        AsyncStorage.getItem('driverHasOnboarded')
          .then((value) => (value === 'true' ? setHasOnboarded(true) : router.replace('/onboarding')))
          .catch(() => router.replace('/onboarding'));
      }
      return;
    }
    if (!isAuthed) {
      if (first !== '(auth)') router.replace('/(auth)/login');
      return;
    }
    if (first === '(auth)' || first === 'onboarding') {
      router.replace('/(tabs)');
      return;
    }
    // On a ride: only the ride (and the call) — no tabs, nothing else.
    if (activeRide && !DURING_RIDE.includes(first ?? '')) router.replace('/ride');
  }, [ready, hasOnboarded, user, token, segments, router, activeRide]);

  if (!ready) return null;
  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        {/* A new request opens on top of everything. */}
        <Stack.Screen name="request/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        {/* The ride takes over the screen until it ends. */}
        <Stack.Screen name="ride" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="call" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="trip/[id]" />
        <Stack.Screen name="withdraw" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="car" />
        <Stack.Screen name="documents" />
        <Stack.Screen name="help" />
        <Stack.Screen name="promotions" />
        <Stack.Screen name="messaging" />
        <Stack.Screen name="safety" />
      </Stack>
      <StatusBar style="dark" />
      <IncomingCallOverlay />
    </ThemeProvider>
  );
}

function Providers() {
  const { user, token } = useAuth();
  // CallProvider stays mounted so the navigator isn't rebuilt on login; with
  // no user it stays idle and doesn't connect to call signaling.
  return (
    <CallProvider userId={user && token ? String(user.id) : ''} displayName={user?.name ?? ''} authToken={token ?? ''}>
      <DriverAvailabilityProvider>
        <DriverWorkProvider>
          <Guard />
        </DriverWorkProvider>
      </DriverAvailabilityProvider>
    </CallProvider>
  );
}

export default function RootLayout() {
  const fontsReady = useFlowFonts();
  if (!fontsReady) return null;
  return (
    <AuthProvider>
      <I18nProvider>
        <DesignProvider density="driver">
          <Providers />
        </DesignProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
