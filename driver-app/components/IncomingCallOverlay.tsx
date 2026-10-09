import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { RoundButton } from '@/components/round-button';
import { Avatar, colors, firstName, radius, space, Text } from '@/design';
import { useCall } from '@/hooks/useCall';
import { useT } from '@/i18n';

// The rider is calling: who, and two big buttons.
export function IncomingCallOverlay() {
  const router = useRouter();
  const { t } = useT();
  const { phase, callInfo, acceptCall, rejectCall } = useCall();

  const accept = async () => {
    await acceptCall();
    router.push('/call');
  };

  return (
    <Modal visible={phase === 'incoming'} transparent animationType="slide" statusBarTranslucent onRequestClose={rejectCall}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text variant="overline" color={colors.onDarkMuted}>{t('call.incoming')}</Text>
          <Avatar name={callInfo?.peerName} size={88} dark />
          <Text variant="title" color={colors.onDark}>{firstName(callInfo?.peerName) || t('call.unknown')}</Text>
          <View style={styles.actions}>
            <RoundButton icon="phone-off" label={t('call.decline')} onPress={rejectCall} danger />
            <RoundButton icon="phone" label={t('call.accept')} onPress={accept} light />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.night, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    paddingTop: space.xxl, paddingBottom: space.xxxl * 1.5, paddingHorizontal: space.xxl, alignItems: 'center', gap: space.lg,
  },
  actions: { flexDirection: 'row', gap: 64, marginTop: space.lg },
});
