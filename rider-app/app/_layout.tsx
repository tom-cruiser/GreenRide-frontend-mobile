import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

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

  return (
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
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
