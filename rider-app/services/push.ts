import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { pushAPI } from './api';

// Expo push notifications. After sign-in the app asks for permission, gets
// this device's Expo push token and gives it to the backend, which sends ride
// invitations and updates to it.
//
// Needs a development or release build with an EAS project id
// (app.json → expo.extra.eas.projectId). Expo Go on Android cannot receive
// remote pushes and expo-notifications throws as soon as it is imported
// there, so the module is only loaded outside Expo Go. In Expo Go the app
// still gets in-app notifications live over Socket.io (see _layout).

type NotificationsModule = typeof import('expo-notifications');

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const Notifications: NotificationsModule | null = (() => {
  if (inExpoGo || Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
})();

export const pushSupported = Notifications !== null;

// Show notifications while the app is open, too.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;

let registered: string | null = null;

export async function registerForPush(authToken: string): Promise<string | null> {
  if (!Notifications) return null;
  try {
    const id = projectId();
    if (!id) {
      if (__DEV__) console.warn('[push] No EAS project id in app.json; push notifications are off.');
      return null;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Rides',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return null;

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await pushAPI.register(authToken, pushToken, Platform.OS === 'ios' ? 'ios' : 'android');
    registered = pushToken;
    return pushToken;
  } catch (e) {
    // Emulators without Google Play services, no network, etc.
    if (__DEV__) console.warn('[push] registration failed:', e);
    return null;
  }
}

// On sign-out: this device should stop getting this rider's notifications.
export async function unregisterPush(authToken: string): Promise<void> {
  if (!registered) return;
  try {
    await pushAPI.remove(authToken, registered);
  } catch {
    // The backend also drops tokens Expo reports as dead.
  }
  registered = null;
}

// Where a notification should open, from the data the backend sends.
export function routeForNotification(data: Record<string, any> | undefined | null): string | null {
  if (!data) return null;
  if (data.screen === 'invitation' && data.invitationId) return `/invitation/${data.invitationId}`;
  if (data.screen === 'friends-ride' && data.groupId) return `/friends-ride/${data.groupId}`;
  return null;
}

// Calls onOpen(route) when the rider taps a push notification, including the
// one that launched the app. Does nothing where pushes aren't available.
export function useNotificationTaps(onOpen: (route: string) => void) {
  useEffect(() => {
    if (!Notifications) return undefined;
    const seen = new Set<string>();
    const handle = (response: import('expo-notifications').NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (seen.has(id)) return;
      seen.add(id);
      const route = routeForNotification(response.notification.request.content.data as any);
      if (route) onOpen(route);
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [onOpen]);
}
