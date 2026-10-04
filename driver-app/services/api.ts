import { getBackendOrigin } from './backend';

const getApiBase = (): string => `${getBackendOrigin()}/api`;

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${getApiBase()}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as any).error || `HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const authAPI = {
  register: (userData: { name: string; email: string; password: string; role?: string }) =>
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

  getRideHistory: (token: string) =>
    apiCall('/rides/history', { headers: authHeader(token) }),

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

export const walletAPI = {
  getBalance: (token: string) =>
    apiCall('/wallet/balance', { headers: authHeader(token) }),

  getTransactions: (token: string) =>
    apiCall('/wallet/transactions', { headers: authHeader(token) }),
};

export const notificationsAPI = {
  getNotifications: (token: string) =>
    apiCall('/notifications', { headers: authHeader(token) }),

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
