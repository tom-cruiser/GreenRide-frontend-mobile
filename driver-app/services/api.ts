import { getBackendOrigin } from './backend';

const getApiBase = (): string => `${getBackendOrigin()}/api`;

// A full URL for a path the backend returns, e.g. a photo's "/api/photos/…".
export const apiUrl = (path: string) => `${getBackendOrigin()}${path}`;

// Keeps the HTTP status so screens can tell e.g. "not found" from a failure.
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// Called when an authenticated request comes back 401 (expired or invalid
// login). AuthContext registers logout here.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

const hasAuthHeader = (headers: RequestInit['headers']) =>
  Boolean(headers && typeof headers === 'object' && 'Authorization' in headers);

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${getApiBase()}${endpoint}`, {
      ...options,
      // Merged after spreading options: options.headers (the login token)
      // must not replace the JSON content type, or bodies arrive empty.
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401 && hasAuthHeader(options.headers)) onUnauthorized?.();
      throw new ApiError((errorData as any).error || `HTTP ${response.status}`, response.status);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const authAPI = {
  register: (userData: { name: string; email: string; password: string; phone?: string; role?: string }) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...userData, role: 'driver' }),
    }),

  login: (credentials: { email: string; password: string }) =>
    apiCall('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  getProfile: (token: string) =>
    apiCall('/auth/profile', { headers: authHeader(token) }),

  updateProfile: (token: string, data: { name?: string; phone?: string }) =>
    apiCall('/auth/profile', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(data),
    }),
};

export const ridesAPI = {
  getRideRequests: (token: string) =>
    apiCall('/rides/requests', { headers: authHeader(token) }),

  // The driver's assigned ride (accepted, arrived or in progress), or null.
  getActiveRide: (token: string) =>
    apiCall('/rides/active', { headers: authHeader(token) }),

  getRideHistory: (token: string) =>
    apiCall('/rides/history', { headers: authHeader(token) }),

  // One ride with rider_id / driver_id and names; only its rider, driver or staff can read it.
  getRide: (token: string, rideId: string | number) =>
    apiCall(`/rides/${rideId}`, { headers: authHeader(token) }),

  getSharedRideGroup: (token: string, groupId: string) =>
    apiCall(`/rides/share/${encodeURIComponent(groupId)}`, {
      headers: authHeader(token),
    }),

  acceptRide: (token: string, rideId: string | number) =>
    apiCall(`/rides/${rideId}/accept`, {
      method: 'POST',
      headers: authHeader(token),
    }),

  startRide: (token: string, rideId: string | number) =>
    apiCall(`/rides/${rideId}/start`, {
      method: 'POST',
      headers: authHeader(token),
    }),

  // Hides a pending request from this driver only; the rider's ride stays open.
  declineRide: (token: string, rideId: string | number) =>
    apiCall(`/rides/${rideId}/decline`, {
      method: 'POST',
      headers: authHeader(token),
    }),

  arriveRide: (token: string, rideId: string | number) =>
    apiCall(`/rides/${rideId}/arrive`, {
      method: 'POST',
      headers: authHeader(token),
    }),

  // For the assigned driver: releases the ride back to other drivers.
  cancelRide: (token: string, rideId: string | number) =>
    apiCall(`/rides/${rideId}/cancel`, {
      method: 'POST',
      headers: authHeader(token),
    }),

  completeRide: (token: string, rideId: string | number) =>
    apiCall(`/rides/${rideId}/complete`, {
      method: 'POST',
      headers: authHeader(token),
    }),
};

export type VehicleDetails = {
  vehicle_make: string;
  vehicle_model: string;
  license_number: string;
};

export const driversAPI = {
  // 404 until the driver has onboarded.
  getMe: (token: string) => apiCall('/drivers/me', { headers: authHeader(token) }),

  onboard: (token: string, details: VehicleDetails) =>
    apiCall('/drivers/onboard', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(details),
    }),

  // Allowed only while waiting for approval.
  updateMe: (token: string, details: VehicleDetails) =>
    apiCall('/drivers/me', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(details),
    }),

  // Approved drivers only. Riders see online drivers near them.
  setAvailability: (token: string, body: { online: boolean; lat?: number; lng?: number }) =>
    apiCall('/drivers/me/availability', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),

  // Earnings (today, week, month), trips, rating, acceptance and today's rides.
  getStats: (token: string) => apiCall('/drivers/me/stats', { headers: authHeader(token) }),

  getDocuments: (token: string) => apiCall('/drivers/me/documents', { headers: authHeader(token) }),

  // One photo per document type; a new upload replaces the old one.
  uploadDocument: async (token: string, type: string, file: { uri: string; name: string; mimeType: string }) => {
    const body = new FormData();
    body.append('type', type);
    body.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    const res = await fetch(`${getApiBase()}/drivers/me/documents`, { method: 'POST', headers: authHeader(token), body });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) onUnauthorized?.();
      throw new ApiError((data as any).error || `HTTP ${res.status}`, res.status);
    }
    return res.json();
  },

  updateLocation: (token: string, position: { lat: number; lng: number }) =>
    apiCall('/drivers/me/location', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(position),
    }),
};

export const walletAPI = {
  getBalance: (token: string) =>
    apiCall('/wallet/balance', { headers: authHeader(token) }),

  getTransactions: (token: string) =>
    apiCall('/wallet/transactions', { headers: authHeader(token) }),

  // To mobile money; the backend checks the minimum and the balance.
  withdraw: (token: string, amount: number, phone: string) =>
    apiCall('/wallet/withdraw', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ amount, phone }),
    }),
};

export const notificationsAPI = {
  getNotifications: (token: string) =>
    apiCall('/notifications', { headers: authHeader(token) }),

  markAllAsRead: (token: string) =>
    apiCall('/notifications/read-all', { method: 'POST', headers: authHeader(token) }),

  markAsRead: (token: string, notificationId: string | number) =>
    apiCall(`/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: authHeader(token),
    }),
};

export const supportAPI = {
  submitTicket: (
    token: string,
    ticketData: { category: string; subject: string; message: string },
  ) =>
    apiCall('/support/tickets', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(ticketData),
    }),

  getTickets: (token: string) =>
    apiCall('/support/tickets', { headers: authHeader(token) }),
};

export const promotionsAPI = {
  getActivePromotions: (token: string) =>
    apiCall('/promotions/active', { headers: authHeader(token) }),

  getUserPromotions: (token: string) =>
    apiCall('/promotions/user', { headers: authHeader(token) }),
};

// Profile photo: one per account, shown in a circle. Photos are private and
// fetched with the signed-in token.
export async function uploadProfilePhoto(token: string, file: { uri: string; name: string; mimeType: string }) {
  const body = new FormData();
  body.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const res = await fetch(`${getApiBase()}/users/me/photo`, { method: 'POST', headers: authHeader(token), body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as any).error || `HTTP ${res.status}`, res.status);
  return data as { photoUrl: string };
}
export const removeProfilePhoto = (token: string) => apiCall('/users/me/photo', { method: 'DELETE', headers: authHeader(token) });
