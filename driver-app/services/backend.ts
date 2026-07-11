import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHostFromExpo = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Fallbacks for older/newer manifest shapes
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ??
    (Constants as any)?.manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') return null;
  return hostUri.split(':')[0] ?? null;
};

const isIpAddress = (host: string): boolean => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

export const getBackendOrigin = (): string => {
  // Prefer explicit configuration (recommended for physical devices)
  const configuredOrigin = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/api$/, '');
  }

  // Dev default: when running in LAN mode, Expo hostUri is usually your machine's LAN IP.
  // In tunnel mode, hostUri will be a public hostname (exp.direct) which is NOT your backend.
  const host = getHostFromExpo();
  if (host && isIpAddress(host)) {
    return `http://${host}:4000`;
  }

  // Emulator fallbacks
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
};
