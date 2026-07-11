/**
 * CallContext — manages the full VoIP call lifecycle.
 *
 * Required packages (run in the rider-app directory):
 *   npx expo install react-native-webrtc
 *   npx expo install socket.io-client
 *
 * iOS Info.plist (already handled via app.json plugin):
 *   NSMicrophoneUsageDescription
 *
 * Android manifest (handled by react-native-webrtc Expo plugin):
 *   RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, INTERNET
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { signalingClient } from '../services/signalingClient';

// ─── ICE servers ─────────────────────────────────────────────────────────────
function buildIceServers() {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  if (process.env.EXPO_PUBLIC_TURN_ENABLED === 'true') {
    servers.push({
      urls: process.env.EXPO_PUBLIC_TURN_URL ?? 'turn:openrelay.metered.ca:80',
      username: process.env.EXPO_PUBLIC_TURN_USERNAME ?? 'openrelayproject',
      credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL ?? 'openrelayproject',
    });
  }
  return servers;
}

// ─── State ────────────────────────────────────────────────────────────────────
export type CallPhase =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'negotiating'
  | 'active'
  | 'ended';

export interface CallInfo {
  callId: string;
  peerId: string;
  peerName: string;
  isOutgoing: boolean;
}

type Action =
  | { type: 'OUTGOING'; info: CallInfo }
  | { type: 'INCOMING'; info: CallInfo }
  | { type: 'NEGOTIATING' }
  | { type: 'ACTIVE' }
  | { type: 'END' }
  | { type: 'MUTE_TOGGLE' }
  | { type: 'TICK' };

interface State {
  phase: CallPhase;
  callInfo: CallInfo | null;
  isMuted: boolean;
  durationSeconds: number;
}

const INITIAL: State = {
  phase: 'idle',
  callInfo: null,
  isMuted: false,
  durationSeconds: 0,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'OUTGOING':
      return { ...INITIAL, phase: 'outgoing', callInfo: action.info };
    case 'INCOMING':
      return { ...INITIAL, phase: 'incoming', callInfo: action.info };
    case 'NEGOTIATING':
      return { ...state, phase: 'negotiating' };
    case 'ACTIVE':
      return { ...state, phase: 'active', durationSeconds: 0 };
    case 'END':
      return { ...INITIAL, phase: 'ended' };
    case 'MUTE_TOGGLE':
      return { ...state, isMuted: !state.isMuted };
    case 'TICK':
      return { ...state, durationSeconds: state.durationSeconds + 1 };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
export interface CallContextValue {
  phase: CallPhase;
  callInfo: CallInfo | null;
  isMuted: boolean;
  durationSeconds: number;
  initiateCall: (peerId: string, peerName: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS prompts via getUserMedia
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone Permission',
      message: 'GreenRider needs microphone access for calls.',
      buttonPositive: 'Allow',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function getAudioStream(): Promise<MediaStream> {
  return mediaDevices.getUserMedia({ audio: true, video: false }) as Promise<MediaStream>;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
interface CallProviderProps {
  children: React.ReactNode;
  userId: string;
  displayName: string;
  authToken: string;
}

export function CallProvider({
  children,
  userId,
  displayName,
  authToken,
}: CallProviderProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Keep a ref so event handlers always read fresh state without re-subscribing
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // WebRTC refs — not React state to avoid re-renders on every ICE tick
  const pc = useRef<InstanceType<typeof RTCPeerConnection> | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const iceBuf = useRef<any[]>([]);
  const remoteDescSet = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Connect signaling on mount / user change ──────────────────────────────
  useEffect(() => {
    if (!userId) return;
    signalingClient.connect(userId, displayName, authToken);
    return () => signalingClient.disconnect();
  }, [userId, displayName, authToken]);

  // ── Cleanup helper ────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    localStream.current?.getTracks().forEach((t: any) => t.stop());
    localStream.current = null;
    pc.current?.close();
    pc.current = null;
    iceBuf.current = [];
    remoteDescSet.current = false;
  }, []);

  // ── Create RTCPeerConnection ───────────────────────────────────────────────
  const createPeerConnection = useCallback((callId: string) => {
    const conn = new RTCPeerConnection({ iceServers: buildIceServers() });

    conn.onicecandidate = ({ candidate }: any) => {
      if (!candidate) return;
      signalingClient.send('ice-candidate', {
        callId,
        candidate: {
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        },
      });
    };

    conn.oniceconnectionstatechange = () => {
      const s = conn.iceConnectionState;
      if (s === 'failed') {
        signalingClient.send('ice-failure', { callId, stats: { iceState: 'failed' } });
        (conn as any).restartIce?.();
      }
      if (s === 'connected' || s === 'completed') {
        dispatch({ type: 'ACTIVE' });
        if (!timerRef.current) {
          timerRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000);
        }
      }
    };

    // Audio-only — remote tracks play automatically via react-native-webrtc
    conn.ontrack = () => {};

    pc.current = conn;
    return conn;
  }, []);

  // ── Flush buffered ICE candidates after remote desc is set ────────────────
  const flushIceBuffer = useCallback(async (conn: InstanceType<typeof RTCPeerConnection>) => {
    remoteDescSet.current = true;
    for (const c of iceBuf.current) {
      await (conn as any).addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    iceBuf.current = [];
  }, []);

  // ── Attach local audio stream ─────────────────────────────────────────────
  const attachLocalStream = useCallback(
    async (conn: InstanceType<typeof RTCPeerConnection>) => {
      const stream = await getAudioStream();
      localStream.current = stream;
      stream.getTracks().forEach((track: any) => (conn as any).addTrack(track, stream));
    },
    [],
  );

  // ── Public actions ────────────────────────────────────────────────────────
  const initiateCall = useCallback(
    async (peerId: string, peerName: string) => {
      const ok = await requestMicPermission();
      if (!ok) {
        Alert.alert('Permission required', 'Microphone access is needed for calls.');
        return;
      }
      const callId = `${userId}::${peerId}::${Date.now()}`;
      const info: CallInfo = { callId, peerId, peerName, isOutgoing: true };
      dispatch({ type: 'OUTGOING', info });
      signalingClient.send('call-request', {
        callId,
        callerId: userId,
        callerName: displayName,
        receiverId: peerId,
      });
    },
    [userId, displayName],
  );

  const acceptCall = useCallback(async () => {
    const { callInfo } = stateRef.current;
    if (!callInfo) return;

    const ok = await requestMicPermission();
    if (!ok) {
      signalingClient.send('call-rejected', { callId: callInfo.callId, reason: 'rejected' });
      dispatch({ type: 'END' });
      return;
    }

    dispatch({ type: 'NEGOTIATING' });
    signalingClient.send('call-accepted', { callId: callInfo.callId });
    const conn = createPeerConnection(callInfo.callId);
    await attachLocalStream(conn);
    // Caller will send 'offer' — handled in the signaling listener below
  }, [createPeerConnection, attachLocalStream]);

  const rejectCall = useCallback(() => {
    const { callInfo } = stateRef.current;
    if (callInfo) {
      signalingClient.send('call-rejected', { callId: callInfo.callId, reason: 'rejected' });
    }
    cleanup();
    dispatch({ type: 'END' });
  }, [cleanup]);

  const endCall = useCallback(() => {
    const { callInfo } = stateRef.current;
    if (callInfo) {
      signalingClient.send('call-ended', { callId: callInfo.callId });
    }
    cleanup();
    dispatch({ type: 'END' });
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const nowMuted = !stateRef.current.isMuted;
    localStream.current?.getAudioTracks().forEach((t: any) => {
      t.enabled = !nowMuted;
    });
    dispatch({ type: 'MUTE_TOGGLE' });
  }, []);

  // ── Signaling event listeners ─────────────────────────────────────────────
  useEffect(() => {
    // Incoming call request
    const offReq = signalingClient.on('call-request', (msg: any) => {
      if (stateRef.current.phase !== 'idle') return; // busy; server already replied
      dispatch({
        type: 'INCOMING',
        info: {
          callId: msg.callId,
          peerId: msg.callerId,
          peerName: msg.callerName,
          isOutgoing: false,
        },
      });
    });

    // Caller receives acceptance → create offer
    const offAccepted = signalingClient.on('call-accepted', async () => {
      const { callInfo, phase } = stateRef.current;
      if (phase !== 'outgoing' || !callInfo) return;

      dispatch({ type: 'NEGOTIATING' });
      const conn = createPeerConnection(callInfo.callId);
      await attachLocalStream(conn);

      const offer = await (conn as any).createOffer({});
      await (conn as any).setLocalDescription(new RTCSessionDescription(offer));
      signalingClient.send('offer', { callId: callInfo.callId, sdp: offer });
    });

    // Callee receives offer → create answer
    const offOffer = signalingClient.on('offer', async (msg: any) => {
      const { callInfo, phase } = stateRef.current;
      if (!pc.current || !callInfo || phase !== 'negotiating') return;

      await (pc.current as any).setRemoteDescription(new RTCSessionDescription(msg.sdp));
      await flushIceBuffer(pc.current);

      const answer = await (pc.current as any).createAnswer();
      await (pc.current as any).setLocalDescription(new RTCSessionDescription(answer));
      signalingClient.send('answer', { callId: callInfo.callId, sdp: answer });
    });

    // Caller receives answer → set remote desc
    const offAnswer = signalingClient.on('answer', async (msg: any) => {
      if (!pc.current) return;
      await (pc.current as any).setRemoteDescription(new RTCSessionDescription(msg.sdp));
      await flushIceBuffer(pc.current);
    });

    // ICE candidate from peer
    const offIce = signalingClient.on('ice-candidate', async (msg: any) => {
      if (!pc.current) return;
      if (!remoteDescSet.current) {
        iceBuf.current.push(msg.candidate);
        return;
      }
      await (pc.current as any)
        .addIceCandidate(new RTCIceCandidate(msg.candidate))
        .catch(() => {});
    });

    // Remote peer rejected
    const offRejected = signalingClient.on('call-rejected', () => {
      cleanup();
      dispatch({ type: 'END' });
    });

    // Remote peer ended
    const offEnded = signalingClient.on('call-ended', () => {
      cleanup();
      dispatch({ type: 'END' });
    });

    // Receiver is busy or unreachable
    const offBusy = signalingClient.on('call-busy', (msg: any) => {
      Alert.alert(
        'Call Failed',
        msg.reason === 'busy' ? 'User is on another call.' : 'User is unreachable.',
      );
      cleanup();
      dispatch({ type: 'END' });
    });

    // Peer reconnected after transient disconnect — rejoin room so server re-routes
    const offRecon = signalingClient.on('peer-reconnected', (msg: any) => {
      const { callInfo } = stateRef.current;
      if (!callInfo || callInfo.callId !== msg.callId) return;
      signalingClient.send('rejoin-room', { callId: callInfo.callId });
    });

    return () => {
      offReq();
      offAccepted();
      offOffer();
      offAnswer();
      offIce();
      offRejected();
      offEnded();
      offBusy();
      offRecon();
    };
  }, [createPeerConnection, attachLocalStream, flushIceBuffer, cleanup]);

  const value: CallContextValue = {
    phase: state.phase,
    callInfo: state.callInfo,
    isMuted: state.isMuted,
    durationSeconds: state.durationSeconds,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

// ─── Consumer hook ────────────────────────────────────────────────────────────
export function useCallContext(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext must be used within CallProvider');
  return ctx;
}
