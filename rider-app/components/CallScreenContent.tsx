import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCall } from '@/hooks/useCall';

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'outgoing':
      return 'Calling…';
    case 'negotiating':
      return 'Connecting…';
    case 'active':
      return 'Connected';
    default:
      return '';
  }
}

export default function CallScreenContent() {
  const { phase, callInfo, isMuted, durationSeconds, endCall, toggleMute } = useCall();
  const router = useRouter();

  useEffect(() => {
    if (phase === 'idle' || phase === 'ended') {
      router.back();
    }
  }, [phase, router]);

  if (!callInfo) return null;

  const isActive = phase === 'active';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

      <View style={styles.top}>
        <Text style={styles.appLabel}>GreenRider Call</Text>
      </View>

      <View style={styles.peerSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>
            {callInfo.peerName?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.peerName}>{callInfo.peerName}</Text>
        <Text style={styles.statusText}>{phaseLabel(phase)}</Text>
        {isActive && (
          <Text style={styles.duration}>{formatDuration(durationSeconds)}</Text>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={toggleMute}
          accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙'}</Text>
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.endBtn]}
          onPress={endCall}
          accessibilityLabel="End call"
        >
          <Text style={styles.controlIcon}>✕</Text>
          <Text style={styles.controlLabel}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'center',
    paddingTop: 20,
  },
  appLabel: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  peerSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
  },
  peerName: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  statusText: {
    color: '#888',
    fontSize: 16,
  },
  duration: {
    color: '#ccc',
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 40,
  },
  controlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  controlBtnActive: {
    backgroundColor: '#374151',
  },
  endBtn: {
    backgroundColor: '#e53935',
    width: 72,
    height: 72,
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    color: '#ccc',
    fontSize: 11,
  },
});