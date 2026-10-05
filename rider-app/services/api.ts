import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ApiConfig = {
  baseUrl: string;
  origin: string;
};

const getHostFromExpo = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ??
    (Constants as any)?.manifest?.debuggerHost;
  if (!hostUri || typeof hostUri !== 'string') return null;
  return hostUri.split(':')[0] ?? null;
};

const normalizeBaseUrl = (maybeBaseUrl: string): string => {
  const trimmed = maybeBaseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const getApiConfig = (): ApiConfig => {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configuredBaseUrl) {
    const baseUrl = normalizeBaseUrl(configuredBaseUrl);
    return { baseUrl, origin: baseUrl.replace(/\/api$/, '') };
  }
  const host = getHostFromExpo();
  const origin = host
    ? `http://${host}:4000`
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:4000'
      : 'http://localhost:4000';
  return { baseUrl: `${origin}/api`, origin };
};

const { baseUrl: API_BASE_URL } = getApiConfig();

// eslint-disable-next-line no-console
console.log('[api] base URL:', API_BASE_URL);

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  // eslint-disable-next-line no-console
  console.log('[api] →', options.method ?? 'GET', `${API_BASE_URL}${endpoint}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

export const authAPI = {
  register: async (userData: { name: string; email: string; password: string }) =>
    apiCall('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  login: async (credentials: { email: string; password: string }) =>
    apiCall('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  getProfile: async (token: string) =>
    apiCall('/auth/profile', { headers: { Authorization: `Bearer ${token}` } }),

  updateProfile: async (token: string, data: { name?: string; phone?: string }) =>
    apiCall('/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),
};

// Wallet — user identity is resolved from the JWT on the backend; no user_id needed in requests
export const walletAPI = {
  getBalance: async (token: string) =>
    apiCall('/wallet/balance', { headers: { Authorization: `Bearer ${token}` } }),

  // Starts a mobile-money top-up; the balance updates once the provider confirms.
  topUp: async (token: string, amount: number) =>
    apiCall('/payments/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    }),

  withdraw: async (token: string, amount: number) =>
    apiCall('/wallet/withdraw', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    }),

  getTransactions: async (token: string) =>
    apiCall('/wallet/transactions', { headers: { Authorization: `Bearer ${token}` } }),
};

// Rides — rider_id and user_id resolved from JWT on backend
export const ridesAPI = {
  bookRide: async (
    token: string,
    rideData: {
      pickup: string;
      dropoff: string;
      distance: number;
      is_shared?: boolean;
      max_co_riders?: number;
      pickup_lat?: number;
      pickup_lng?: number;
    },
  ) =>
    apiCall('/rides/book', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(rideData),
    }),

  getRideHistory: async (token: string) =>
    apiCall('/rides/history', { headers: { Authorization: `Bearer ${token}` } }),

  // One ride with rider_id / driver_id and names; only its rider, driver or staff can read it.
  getRide: async (token: string, rideId: string | number) =>
    apiCall(`/rides/${rideId}`, { headers: { Authorization: `Bearer ${token}` } }),

  acceptRide: async (token: string, rideId: string) =>
    apiCall(`/rides/${rideId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  startRide: async (token: string, rideId: string) =>
    apiCall(`/rides/${rideId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  cancelRide: async (token: string, rideId: string) =>
    apiCall(`/rides/${rideId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getSharedRideGroup: async (token: string, groupId: string) =>
    apiCall(`/rides/share/${encodeURIComponent(groupId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  rateRide: async (token: string, rideId: string, rating: number, feedback?: string) =>
    apiCall(`/rides/${rideId}/rate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rating, feedback }),
    }),
};

export const notificationsAPI = {
  getNotifications: async (token: string) =>
    apiCall('/notifications', { headers: { Authorization: `Bearer ${token}` } }),

  markAsRead: async (token: string, notificationId: string) =>
    apiCall(`/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const driversAPI = {
  getNearbyDrivers: async (token: string, lat: number, lng: number, radius = 5) =>
    apiCall(`/drivers/nearby?lat=${lat}&lng=${lng}&radius=${radius}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const supportAPI = {
  submitTicket: async (
    token: string,
    ticketData: { category: string; subject: string; message: string },
  ) =>
    apiCall('/support/tickets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(ticketData),
    }),

  getTickets: async (token: string) =>
    apiCall('/support/tickets', { headers: { Authorization: `Bearer ${token}` } }),
};

export const promotionsAPI = {
  getActivePromotions: async (token: string) =>
    apiCall('/promotions/active', { headers: { Authorization: `Bearer ${token}` } }),

  applyPromoCode: async (token: string, promoCode: string) =>
    apiCall('/promotions/apply', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: promoCode }),
    }),

  getUserPromotions: async (token: string) =>
    apiCall('/promotions/user', { headers: { Authorization: `Bearer ${token}` } }),
};
