import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { pushAPI } from './api';

// Expo push notifications. After sign-in the app asks for permission, gets
// this device's Expo push token and gives it to the backend, which sends ride
// invitations and updates to it. Needs a development or release build with an
// EAS project id (app.json → expo.extra.eas.projectId); Expo Go on Android
// cannot receive remote pushes, so there it quietly does nothing.

// Show notifications while the app is open, too.
Notifications.setNotificationHandler({
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
  try {
    if (!Device.isDevice) return null; // simulators have no push token
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

// Where a tapped notification should open, from the data the backend sends.
export function routeForNotification(data: Record<string, any> | undefined | null): string | null {
  if (!data) return null;
  if (data.screen === 'invitation' && data.invitationId) return `/invitation/${data.invitationId}`;
  if (data.screen === 'friends-ride' && data.groupId) return `/friends-ride/${data.groupId}`;
  return null;
}
