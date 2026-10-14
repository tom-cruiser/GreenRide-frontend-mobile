import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { pushAPI } from './api';

// Expo push notifications. After sign-in the app asks for permission, gets
// this device's Expo push token and gives it to the backend, which sends
// announcements from the Flow team to it: they stay in the phone's
// notification shade (pull down from the top) until opened or cleared.
//
// Needs the EAS project id (app.json → expo.extra.eas.projectId) and a
// development or release build: Expo Go on Android cannot receive remote
// pushes and expo-notifications throws as soon as it is imported there, so the
// module is not loaded in that case. The app still shows announcements live
// over Socket.io (DriverWorkContext).

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

// While the app is open an announcement already rings and shows on screen
// (DriverWorkContext), so its push only goes to the notification shade.
// Anything else shows as a banner with sound.
Notifications?.setNotificationHandler({
  handleNotification: async (notification) => {
    const quiet = (notification.request.content.data as Record<string, any> | null)?.type === 'announcement';
    return { shouldShowBanner: !quiet, shouldShowList: true, shouldPlaySound: !quiet, shouldSetBadge: false };
  },
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
        name: 'Updates',
        importance: Notifications.AndroidImportance.HIGH,
      });
      // Messages from the Flow team: the Flow chime, a banner over any open
      // app and on the lock screen. (Android keeps a channel's settings once
      // created, so changing them means a new channel id.)
      await Notifications.setNotificationChannelAsync('announcements', {
        name: 'Announcements',
        description: 'Messages from the Flow team',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'announcement.wav',
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#111111',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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

// On sign-out: this device should stop getting this driver's notifications.
export async function unregisterPush(authToken: string): Promise<void> {
  if (!registered) return;
  try {
    await pushAPI.remove(authToken, registered);
  } catch {
    // The backend also drops tokens Expo reports as dead.
  }
  registered = null;
}

// Calls onOpen() when the driver taps a notification, including the one that
// launched the app. Does nothing where pushes aren't available.
export function useNotificationTaps(onOpen: () => void) {
  useEffect(() => {
    if (!Notifications) return undefined;
    const seen = new Set<string>();
    const handle = (response: import('expo-notifications').NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (seen.has(id)) return;
      seen.add(id);
      onOpen();
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [onOpen]);
}
