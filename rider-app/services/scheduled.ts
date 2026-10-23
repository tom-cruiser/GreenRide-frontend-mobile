import { apiCall } from './api';

// Scheduled trips: drivers post them ahead of time (route with stops, time,
// seats, their own price per seat, their car); riders book seats. The price
// is held from the wallet until the trip ends (GET/POST /api/scheduled-trips).

export type TripPlace = { name: string; lat: number; lng: number };

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
  driver: { firstName: string; initials: string; photoUrl: string | null; rating: number | null };
  car: { make: string | null; model: string | null; color: string | null; plate: string | null; photoUrl: string | null };
  mine: boolean;
  myBooking: { id: number; seats: number; amount: number; pickup: string; status: 'booked' | 'cancelled' | 'completed' } | null;
  distanceFromYouKm?: number | null;
};

const authed = (token: string, init: RequestInit = {}): RequestInit => ({ ...init, headers: { Authorization: `Bearer ${token}` } });
const post = (token: string, body?: unknown): RequestInit =>
  authed(token, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const scheduledAPI = {
  list: (token: string, near?: { lat: number; lng: number }) =>
    apiCall(`/scheduled-trips${near ? `?lat=${near.lat}&lng=${near.lng}` : ''}`, authed(token)) as Promise<{ trips: ScheduledTrip[] }>,
  myBookings: (token: string) => apiCall('/scheduled-trips/bookings', authed(token)) as Promise<{ trips: ScheduledTrip[] }>,
  get: (token: string, id: string | number) => apiCall(`/scheduled-trips/${id}`, authed(token)) as Promise<{ trip: ScheduledTrip }>,
  book: (token: string, id: string | number, seats: number, pickup: string) =>
    apiCall(`/scheduled-trips/${id}/book`, post(token, { seats, pickup })) as Promise<{ trip: ScheduledTrip }>,
  cancelBooking: (token: string, id: string | number) =>
    apiCall(`/scheduled-trips/${id}/cancel-booking`, post(token)) as Promise<{ trip: ScheduledTrip }>,
};

// Every place a rider can get on: the origin and the stops (not the destination).
export const pickupsOf = (trip: ScheduledTrip) => [trip.origin, ...trip.stops].map((p) => p.name);
