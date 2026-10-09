import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { pushAPI } from './api';

// Expo push notifications. After sign-in the app asks for permission, gets
// this device's Expo push token and gives it to the backend, which sends ride
// invitations and updates to it.
//
// Needs the EAS project id (app.json → expo.extra.eas.projectId). Expo Go on
// Android cannot receive remote pushes and expo-notifications throws as soon
// as it is imported there, so the module is not loaded in that case; the app
// still gets in-app notifications live over Socket.io (see _layout). Expo Go
// on iPhone gets pushes, but the Accept/Decline buttons on a notification
// need a development or release build.
//
// Ride invitations and friend requests come with Accept and Decline buttons
// (the backend sends their category id), so the rider can answer from the
// notification without opening the screen first.

type NotificationsModule = typeof import('expo-notifications');

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const Notifications: NotificationsModule | null = (() => {
  if ((inExpoGo && Platform.OS === 'android') || Platform.OS === 'web') return null;
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

// Buttons on a notification. Both open the app, so the answer is sent with the
// rider's session and they see what happened (or why it could not be done).
export type PushAction = 'accept' | 'decline';
async function setCategories(N: NotificationsModule) {
  const actions = [
    { identifier: 'accept', buttonTitle: 'Accept', options: { opensAppToForeground: true } },
    { identifier: 'decline', buttonTitle: 'Decline', options: { opensAppToForeground: true, isDestructive: true } },
  ];
  await Promise.all([
    N.setNotificationCategoryAsync('ride_invite', actions),
    N.setNotificationCategoryAsync('friend_request', actions),
  ]);
}

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
    await setCategories(Notifications).catch(() => {});
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
  if (data.screen === 'join') return '/join';
  return null;
}

// Calls onOpen(route) when the rider taps a push notification, including the
// one that launched the app, and onAction when they press Accept or Decline
// on it. Does nothing where pushes aren't available.
export function useNotificationTaps(
  onOpen: (route: string) => void,
  onAction: (action: PushAction, data: Record<string, any>) => void,
) {
  useEffect(() => {
    if (!Notifications) return undefined;
    const seen = new Set<string>();
    const handle = (response: import('expo-notifications').NotificationResponse | null) => {
      if (!response) return;
      const { identifier, content } = response.notification.request;
      const key = `${identifier}:${response.actionIdentifier}`;
      if (seen.has(key)) return;
      seen.add(key);
      const data = (content.data ?? {}) as Record<string, any>;
      if (response.actionIdentifier === 'accept' || response.actionIdentifier === 'decline') {
        Notifications.dismissNotificationAsync(identifier).catch(() => {});
        onAction(response.actionIdentifier, data);
        return;
      }
      const route = routeForNotification(data);
      if (route) onOpen(route);
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [onOpen, onAction]);
}
