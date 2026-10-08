import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCall } from '@/hooks/useCall';

export function IncomingCallOverlay() {
  const { phase, callInfo, acceptCall, rejectCall } = useCall();
  const router = useRouter();

  const visible = phase === 'incoming';

  const handleAccept = async () => {
    await acceptCall();
    router.push('/call');
  };

  const handleReject = () => {
    rejectCall();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleReject}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.appLabel}>Flow</Text>

          {/* Caller info */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {callInfo?.peerName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.callerName}>{callInfo?.peerName ?? 'Unknown'}</Text>
          <Text style={styles.status}>Incoming call…</Text>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={handleReject}
              accessibilityLabel="Reject call"
            >
              <Text style={styles.actionIcon}>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={handleAccept}
              accessibilityLabel="Accept call"
            >
              <Text style={styles.actionIcon}>✆</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Slide up to answer</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 44,
  },
  card: {
    backgroundColor: '#1c1c2e',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  appLabel: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
  },
  callerName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  status: {
    color: '#aaa',
    fontSize: 15,
    marginBottom: 36,
  },
  actions: {
    flexDirection: 'row',
    gap: 48,
    marginBottom: 20,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#e53935',
  },
  acceptBtn: {
    backgroundColor: '#111111',
  },
  actionIcon: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  hint: {
    color: '#666',
    fontSize: 13,
  },
});
