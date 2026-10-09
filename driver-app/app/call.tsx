import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { RoundButton } from '@/components/round-button';
import { Avatar, colors, firstName, Screen, space, Text } from '@/design';
import { useCall } from '@/hooks/useCall';
import { useT } from '@/i18n';

const duration = (secs: number) =>
  `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

// The call with the rider: who, the state, mute and hang up. Big round
// buttons that are easy to hit without looking twice.
export default function CallScreen() {
  const router = useRouter();
  const { t } = useT();
  const { phase, callInfo, isMuted, durationSeconds, endCall, toggleMute } = useCall();

  // Close when the call finishes.
  useEffect(() => {
    if (phase === 'idle' || phase === 'ended') router.back();
  }, [phase, router]);

  if (!callInfo) return null;

  const state = phase === 'active' ? t('call.connected') : phase === 'negotiating' ? t('call.connecting') : t('call.calling');

  return (
    <Screen dark scroll={false} edges={['top', 'bottom']} contentStyle={styles.page}>
      <StatusBar style="light" />
      <View style={styles.peer}>
        <Avatar name={callInfo.peerName} size={104} dark />
        <Text variant="title" color={colors.onDark} style={{ marginTop: space.xl }}>
          {firstName(callInfo.peerName) || t('call.unknown')}
        </Text>
        <Text color={colors.onDarkMuted} style={{ marginTop: space.xs }}>{state}</Text>
        {phase === 'active' && (
          <Text color={colors.onDark} weight="semibold" style={{ marginTop: space.md, fontSize: 24, lineHeight: 30, fontVariant: ['tabular-nums'] }}>
            {duration(durationSeconds)}
          </Text>
        )}
      </View>
      <View style={styles.controls}>
        <RoundButton icon={isMuted ? 'mic-off' : 'mic'} label={isMuted ? t('call.unmute') : t('call.mute')} onPress={toggleMute} active={isMuted} />
        <RoundButton icon="phone-off" label={t('call.end')} onPress={endCall} danger />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'space-between', paddingVertical: space.xxxl },
  peer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 56 },
});
