/**
 * Singleton Socket.io client for the GreenRider VoIP signaling server.
 *
 * Install required package:
 *   npx expo install socket.io-client
 */

import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── URL resolution ───────────────────────────────────────────────────────────
function getSignalingUrl(): string {
  const configured = process.env.EXPO_PUBLIC_SIGNALING_URL;
  if (configured) return configured;

  const hostUri: string | undefined =
    (Constants.expoConfig?.hostUri as string | undefined) ??
    ((Constants as any)?.manifest2?.extra?.expoClient?.hostUri as string | undefined) ??
    ((Constants as any)?.manifest?.debuggerHost as string | undefined);

  const host = hostUri ? hostUri.split(':')[0] : null;
  // Call signaling now runs inside the main backend (same port as the API).
  if (host) return `http://${host}:4000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Handler = (data: any) => void;
type Unsubscribe = () => void;

const SERVER_EVENTS = [
  'registered',
  'call-request',
  'call-accepted',
  'call-rejected',
  'call-ended',
  'call-busy',
  'offer',
  'answer',
  'ice-candidate',
  'peer-disconnected',
  'peer-reconnected',
  'error',
] as const;

// ─── Client ───────────────────────────────────────────────────────────────────
class SignalingClient {
  private socket: Socket | null = null;
  private creds = { userId: '', displayName: '', authToken: '' };
  private bus = new Map<string, Set<Handler>>();

  connect(userId: string, displayName: string, authToken: string): void {
    Object.assign(this.creds, { userId, displayName, authToken });

    if (this.socket?.connected) {
      this.register();
      return;
    }

    this.socket?.disconnect();

    const sock = io(getSignalingUrl(), {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    this.socket = sock;

    sock.on('connect', () => this.register());

    for (const ev of SERVER_EVENTS) {
      sock.on(ev, (data: unknown) => this.dispatch(ev, data));
    }
  }

  private register(): void {
    this.socket?.emit('register', this.creds);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  send(event: string, data: unknown): void {
    this.socket?.emit(event, data);
  }

  on(event: string, handler: Handler): Unsubscribe {
    if (!this.bus.has(event)) this.bus.set(event, new Set());
    this.bus.get(event)!.add(handler);
    return () => this.bus.get(event)?.delete(handler);
  }

  private dispatch(event: string, data: unknown): void {
    this.bus.get(event)?.forEach(h => h(data));
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const signalingClient = new SignalingClient();
