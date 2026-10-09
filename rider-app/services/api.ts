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

const { baseUrl: API_BASE_URL, origin: API_ORIGIN } = getApiConfig();

// Full address of a path the API returns (e.g. a photo's /api/photos/...).
export const apiUrl = (path: string) => `${API_ORIGIN}${path}`;

// eslint-disable-next-line no-console
console.log('[api] base URL:', API_BASE_URL);


// Called when an authenticated request comes back 401 (expired or invalid
// login). AuthContext registers logout here.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

// A failed request: the server's message, its HTTP status and any details
// (e.g. { reason: 'insufficient_balance', price, balance, missing }).
export class ApiError extends Error {
  status: number;
  details: any;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const isInsufficientBalance = (e: unknown): e is ApiError =>
  e instanceof ApiError && e.details?.reason === 'insufficient_balance';

const hasAuthHeader = (headers: RequestInit['headers']) =>
  Boolean(headers && typeof headers === 'object' && 'Authorization' in headers);

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  // eslint-disable-next-line no-console
  console.log('[api] →', options.method ?? 'GET', `${API_BASE_URL}${endpoint}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      // Merged after spreading options: options.headers (the login token)
      // must not replace the JSON content type, or bodies arrive empty.
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401 && hasAuthHeader(options.headers)) onUnauthorized?.();
      throw new ApiError(errorData.error || `HTTP ${response.status}`, response.status, errorData.details);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

export const authAPI = {
  register: async (userData: { name: string; email: string; password: string; phone?: string }) =>
    apiCall('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  login: async (credentials: { email: string; password: string }) =>
    apiCall('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  getProfile: async (token: string) =>
    apiCall('/auth/profile', { headers: { Authorization: `Bearer ${token}` } }),

  updateProfile: async (token: string, data: { name?: string; phone?: string; emergency_contact?: string }) =>
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
  topUp: async (token: string, amount: number, phone?: string) =>
    apiCall('/payments/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount, phone }),
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

  // Server-side fare for a trip; the only source of prices.
  estimate: async (token: string, data: { distance: number; is_shared?: boolean }) =>
    apiCall('/rides/estimate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  // The rider's open ride (waiting for a driver or in progress), or null.
  getActiveRide: async (token: string) =>
    apiCall('/rides/active', { headers: { Authorization: `Bearer ${token}` } }),

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

// Share with friends: the host invites people they know (by phone or ride code).
export type FriendsPerson = { firstName: string; initials: string; photoUrl?: string | null; handle?: string };
export type FriendsGuest = FriendsPerson & {
  invitationId: number;
  status: 'invited' | 'accepted' | 'declined' | 'expired' | 'removed' | 'left';
  via: 'phone' | 'code';
  price: number | null;
};
export type FriendsGroup = {
  groupId: number;
  status: 'gathering' | 'requested' | 'cancelled';
  visibility?: 'friends' | 'public';
  role: 'host' | 'guest' | 'invited';
  code: string;
  link: string;
  pickup: string;
  dropoff: string;
  distance: number;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  requestedAt: string | null;
  currency: string;
  host: FriendsPerson;
  ridersCount: number;
  maxRiders: number;
  seatsLeft: number;
  price: { host: number; guest: number };
  priceIfJoined?: { host: number; guest: number };
  myPrice: number;
  myRideId: number | null;
  invitation: { id: number; status: FriendsGuest['status']; expiresAt: string } | null;
  guests?: FriendsGuest[];
};
export type CodeLookup = {
  groupId: number;
  code: string;
  host: FriendsPerson;
  pickup: string;
  dropoff: string;
  createdAt: string;
  expiresAt: string;
  ridersCount: number;
  maxRiders: number;
  seatsLeft: number;
  price: number;
  currency: string;
  isHost: boolean;
  alreadyJoined: boolean;
};

const authed = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { Authorization: `Bearer ${token}` },
});
const post = (token: string, body?: unknown): RequestInit =>
  authed(token, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const friendsAPI = {
  create: (token: string, ride: { pickup: string; dropoff: string; distance: number; pickup_lat?: number; pickup_lng?: number; visibility?: 'friends' | 'public' }) =>
    apiCall('/rides/friends', post(token, ride)) as Promise<{ group: FriendsGroup }>,
  get: (token: string, groupId: string | number) =>
    apiCall(`/rides/friends/${groupId}`, authed(token)) as Promise<{ group: FriendsGroup }>,
  invite: (token: string, groupId: string | number, phone: string) =>
    apiCall(`/rides/friends/${groupId}/invite`, post(token, { phone })) as Promise<{ invitation: FriendsGuest }>,
  // One tap from the friends list (friends only).
  inviteFriend: (token: string, groupId: string | number, handle: string) =>
    apiCall(`/rides/friends/${groupId}/invite`, post(token, { friend: handle })) as Promise<{ invitation: FriendsGuest }>,
  // Public rides nearby that still have a seat.
  listPublic: (token: string, coords?: { lat: number; lng: number }) =>
    apiCall(`/rides/friends/public${coords ? `?lat=${coords.lat}&lng=${coords.lng}` : ''}`, authed(token)) as Promise<{ rides: PublicRide[] }>,
  joinPublic: (token: string, groupId: string | number) =>
    apiCall(`/rides/friends/${groupId}/join`, post(token)) as Promise<{ group: FriendsGroup }>,
  removeGuest: (token: string, groupId: string | number, invitationId: number) =>
    apiCall(`/rides/friends/${groupId}/guests/${invitationId}`, authed(token, { method: 'DELETE' })) as Promise<{ group: FriendsGroup }>,
  requestDriver: (token: string, groupId: string | number, alone = false) =>
    apiCall(`/rides/friends/${groupId}/request-driver`, post(token, { alone })) as Promise<{ group: FriendsGroup }>,
  // A guest leaves (full refund); the host cancels the whole group.
  leave: (token: string, groupId: string | number) => apiCall(`/rides/friends/${groupId}/leave`, post(token)),
  myInvitations: (token: string) =>
    apiCall('/rides/friends/invitations', authed(token)) as Promise<{ invitations: FriendsGroup[] }>,
  getInvitation: (token: string, invitationId: string | number) =>
    apiCall(`/rides/friends/invitations/${invitationId}`, authed(token)) as Promise<{ group: FriendsGroup }>,
  accept: (token: string, invitationId: string | number) =>
    apiCall(`/rides/friends/invitations/${invitationId}/accept`, post(token)) as Promise<{ group: FriendsGroup }>,
  decline: (token: string, invitationId: string | number) =>
    apiCall(`/rides/friends/invitations/${invitationId}/decline`, post(token)),
  lookupCode: (token: string, code: string) =>
    apiCall(`/rides/friends/code/${encodeURIComponent(code)}`, authed(token)) as Promise<{ ride: CodeLookup }>,
  joinByCode: (token: string, code: string) =>
    apiCall(`/rides/friends/code/${encodeURIComponent(code)}/join`, post(token)) as Promise<{ group: FriendsGroup }>,
};

export type PublicRide = {
  groupId: number;
  host: FriendsPerson;
  pickup: string;
  dropoff: string;
  createdAt: string;
  expiresAt: string;
  ridersCount: number;
  seatsLeft: number;
  price: number;
  currency: string;
  distanceKm: number | null;
  // The rider's own public ride (listed first, so they see it is up).
  mine?: boolean;
};

export type SocialPerson = FriendsPerson & { handle: string };
export type SocialOverview = {
  me: FriendsPerson & { code: string };
  friends: (SocialPerson & { since: string })[];
  incoming: (SocialPerson & { requestId: number })[];
  outgoing: (SocialPerson & { requestId: number })[];
  recent: (SocialPerson & { ridesTogether: number; requested: boolean })[];
};
export type SearchResult = SocialPerson & { relation: 'friend' | 'incoming' | 'outgoing' | 'recent' | 'none' };

// Friends: requests the other rider accepts. Found by Flow code, phone
// number (exact) or a shared ride.
export const socialAPI = {
  overview: (token: string) => apiCall('/friends', authed(token)) as Promise<SocialOverview>,
  search: (token: string, q: string) =>
    apiCall(`/friends/search?q=${encodeURIComponent(q)}`, authed(token)) as Promise<{ results: SearchResult[] }>,
  request: (token: string, target: { code: string } | { phone: string }) =>
    apiCall('/friends/requests', post(token, target)) as Promise<{ status: 'pending' | 'accepted'; person: SocialPerson }>,
  accept: (token: string, requestId: number) => apiCall(`/friends/requests/${requestId}/accept`, post(token)),
  decline: (token: string, requestId: number) => apiCall(`/friends/requests/${requestId}/decline`, post(token)),
  remove: (token: string, handle: string) =>
    apiCall(`/friends/${encodeURIComponent(handle)}`, authed(token, { method: 'DELETE' })),
};

// Profile photo: a picked image, sent as multipart form data.
export async function uploadProfilePhoto(token: string, file: { uri: string; name: string; mimeType: string }) {
  const body = new FormData();
  body.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const res = await fetch(`${API_BASE_URL}/users/me/photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as any).error || `HTTP ${res.status}`, res.status, (data as any).details);
  return data as { photoUrl: string };
}
export const removeProfilePhoto = (token: string) => apiCall('/users/me/photo', authed(token, { method: 'DELETE' }));

export const pushAPI = {
  register: (token: string, pushToken: string, platform: 'ios' | 'android' | 'web') =>
    apiCall('/push-tokens', post(token, { token: pushToken, platform })),
  remove: (token: string, pushToken: string) =>
    apiCall('/push-tokens', authed(token, { method: 'DELETE', body: JSON.stringify({ token: pushToken }) })),
};

export const paymentsAPI = {
  getPayment: async (token: string, paymentId: string | number) =>
    apiCall(`/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } }),

  // Development only (fake payment provider): stands in for approving the
  // mobile-money prompt on the phone.
  devConfirm: async (token: string, paymentId: string | number) =>
    apiCall(`/payments/dev/${paymentId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'succeeded' }),
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
