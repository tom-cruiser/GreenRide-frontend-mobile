import { File as FSFile } from 'expo-file-system';
import { apiCall } from './api';
import { getBackendOrigin } from './backend';

// Scheduled trips the driver hosts: their route with stops, the time, the
// seats in their car and the price of a seat (theirs to set). Riders book
// seats; the driver sees who booked, changes the time, starts and completes
// the trip (POST/GET/PATCH /api/scheduled-trips).

export type TripPlace = { name: string; lat: number; lng: number };

export type TripBooking = {
  id: number;
  firstName: string;
  initials: string;
  photoUrl: string | null;
  phone: string | null;
  seats: number;
  amount: number;
  pickup: string;
  status: 'booked' | 'cancelled' | 'completed';
  bookedAt: string;
};

export type ScheduledTrip = {
  id: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  departureAt: string;
  origin: TripPlace;
  destination: TripPlace;
  stops: TripPlace[];
  distanceKm: number | null;
  durationMin: number | null;
  geometry: [number, number][] | null;
  seatsTotal: number;
  seatsLeft: number;
  pricePerSeat: number;
  currency: string;
  notes: string | null;
  car: { make: string | null; model: string | null; color: string | null; plate: string | null; photoUrl: string | null };
  bookings?: TripBooking[];
};

export type NewTrip = {
  origin: TripPlace;
  destination: TripPlace;
  stops: TripPlace[];
  departureAt: string;
  seats: number;
  pricePerSeat: number;
  car?: { make?: string; model?: string; color?: string; plate?: string };
  notes?: string;
};

const authed = (token: string, init: RequestInit = {}): RequestInit => ({ ...init, headers: { Authorization: `Bearer ${token}` } });
const send = (token: string, method: string, body?: unknown): RequestInit =>
  authed(token, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export const scheduledAPI = {
  create: (token: string, trip: NewTrip) => apiCall('/scheduled-trips', send(token, 'POST', trip)) as Promise<{ trip: ScheduledTrip }>,
  mine: (token: string) => apiCall('/scheduled-trips/mine', authed(token)) as Promise<{ trips: ScheduledTrip[] }>,
  get: (token: string, id: string | number) => apiCall(`/scheduled-trips/${id}`, authed(token)) as Promise<{ trip: ScheduledTrip }>,
  update: (token: string, id: string | number, changes: { departureAt?: string; seats?: number; pricePerSeat?: number; notes?: string | null }) =>
    apiCall(`/scheduled-trips/${id}`, send(token, 'PATCH', changes)) as Promise<{ trip: ScheduledTrip }>,
  start: (token: string, id: string | number) => apiCall(`/scheduled-trips/${id}/start`, send(token, 'POST')) as Promise<{ trip: ScheduledTrip }>,
  complete: (token: string, id: string | number) => apiCall(`/scheduled-trips/${id}/complete`, send(token, 'POST')) as Promise<{ trip: ScheduledTrip }>,
  cancel: (token: string, id: string | number) => apiCall(`/scheduled-trips/${id}/cancel`, send(token, 'POST')) as Promise<{ trip: ScheduledTrip }>,
};

// The car's photo, shown to riders on every trip the driver posts.
export async function uploadCarPhoto(token: string, uri: string) {
  const body = new FormData();
  body.append('file', new FSFile(uri) as unknown as Blob, 'car.jpg');
  const res = await fetch(`${getBackendOrigin()}/api/drivers/me/car-photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as { carPhotoUrl: string };
}
export const removeCarPhoto = (token: string) => apiCall('/drivers/me/car-photo', send(token, 'DELETE'));
