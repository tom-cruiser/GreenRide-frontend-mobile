import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, colors, Icon, type IconName, Screen, space, Text } from '@/design';

const SLIDES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'navigation', title: 'Ride with Flow', text: 'Safe, affordable rides around town, booked in seconds.' },
  { icon: 'users', title: 'Share with friends', text: 'Invite friends to your ride and each pay less.' },
  { icon: 'credit-card', title: 'Pay with your wallet', text: 'Top up with mobile money and pay in one tap.' },
];

// Three short slides, shown once (same layout as the driver app).
export default function OnboardingScreen() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem('riderHasOnboarded', 'true').catch(() => {});
    router.replace('/(auth)/login');
  };

  const slide = SLIDES[i];
  return (
    <Screen dark scroll={false} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Image source={require('@/assets/images/app-logo.png')} style={styles.logo} />
        {!last && <Button size="md" variant="ghostDark" label="Skip" onPress={finish} style={{ paddingHorizontal: 0 }} />}
      </View>
      <View style={styles.middle}>
        {i === 0 ? (
          <Image source={require('@/assets/images/onboarding-visual.png')} style={styles.visual} resizeMode="contain" />
        ) : (
          <View style={styles.iconCircle}><Icon name={slide.icon} size={56} color={colors.ink} /></View>
        )}
      </View>
      <Text color={colors.onDark} weight="bold" style={{ fontSize: 36, lineHeight: 40, letterSpacing: -1.1 }}>{slide.title}</Text>
      <Text color={colors.onDarkMuted} style={{ marginTop: space.md, fontSize: 17, lineHeight: 24 }}>{slide.text}</Text>
      <View style={styles.dots}>
        {SLIDES.map((s, n) => <View key={s.title} style={[styles.dot, n === i && styles.dotOn]} />)}
      </View>
      <Button size="lg" variant="light" label={last ? 'Get started' : 'Next'} icon={last ? undefined : 'arrow-right'}
        onPress={() => (last ? finish() : setI(i + 1))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 48, height: 48, borderRadius: 24 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  visual: { width: '100%', height: '90%' },
  iconCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.onDark, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginVertical: space.xxl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotOn: { width: 28, backgroundColor: colors.onDark },
});
