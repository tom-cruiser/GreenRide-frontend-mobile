import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CallProvider } from '@/contexts/CallContext';
import { IncomingCallOverlay } from '@/components/IncomingCallOverlay';
import { pushSupported, registerForPush, routeForNotification, useNotificationTaps } from '@/services/push';
import { notificationsAPI } from '@/services/api';
import { signalingClient } from '@/services/signalingClient';
import { DesignProvider, useFlowFonts } from '@/design';

// Screens a shared link or a notification can open; kept through sign-in.
const LINKABLE = ['join', 'invitation', 'friends-ride'];

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const { user, token, isLoading } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  // A ride link opened while signed out: open it once the rider has signed in.
  const pendingLink = useRef<string | null>(null);

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
      if (LINKABLE.includes(first)) pendingLink.current = pathname;
      router.replace('/(auth)/login');
      return;
    }

    if (isAuthed && (inAuthGroup || onOnboarding)) {
      const link = pendingLink.current;
      pendingLink.current = null;
      router.replace((link ?? '/(tabs)') as any);
    }
  }, [bootstrapping, hasOnboarded, user, token, segments, router, pathname]);

  // Signed in: this device receives ride invitations and updates.
  useEffect(() => {
    if (token) registerForPush(token);
  }, [token]);

  // A tapped push notification opens its screen (also when it started the app).
  const signedIn = Boolean(user && token);
  const openRoute = useCallback(
    (route: string) => {
      if (signedIn) router.push(route as any);
      else pendingLink.current = route;
    },
    [signedIn, router],
  );
  useNotificationTaps(openRoute);

  // Without pushes (Expo Go): show new notifications as they arrive over the
  // live connection, with a button to open the screen they are about.
  useEffect(() => {
    if (pushSupported || !token) return undefined;
    return signalingClient.on('notification', async (msg: { id?: number }) => {
      try {
        const { notifications } = await notificationsAPI.getNotifications(token);
        const note = notifications?.find((n: any) => n.id === msg?.id);
        if (!note) return;
        const route = routeForNotification(note.data);
        Alert.alert('Flow', note.message, route
          ? [{ text: 'Later', style: 'cancel' }, { text: 'Open', onPress: () => router.push(route as any) }]
          : [{ text: 'OK' }]);
      } catch {
        // The notification is still in the list; nothing else to do.
      }
    });
  }, [token, router]);

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
          <Stack.Screen name="friends-ride/[groupId]" options={{ headerShown: false }} />
          <Stack.Screen name="invitation/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="join/index" options={{ headerShown: false }} />
          <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
          <Stack.Screen name="call" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        </Stack>
        <StatusBar style="auto" />
        <IncomingCallOverlay />
      </ThemeProvider>
    </CallProvider>
  );
}

export default function RootLayout() {
  // Inter, from the shared design system, before anything is drawn.
  const fontsReady = useFlowFonts();
  if (!fontsReady) return null;
  return (
    <AuthProvider>
      <DesignProvider density="rider">
        <RootNavigator />
      </DesignProvider>
    </AuthProvider>
  );
}
