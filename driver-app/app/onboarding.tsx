import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, colors, Icon, type IconName, Screen, space, Text } from '@/design';
import { useT, type TKey } from '@/i18n';

const SLIDES: { icon: IconName; title: TKey; text: TKey }[] = [
  { icon: 'navigation', title: 'onboarding.s1Title', text: 'onboarding.s1Text' },
  { icon: 'bar-chart-2', title: 'onboarding.s2Title', text: 'onboarding.s2Text' },
  { icon: 'shield', title: 'onboarding.s3Title', text: 'onboarding.s3Text' },
];

// Three short slides, shown once.
export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useT();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem('driverHasOnboarded', 'true').catch(() => {});
    router.replace('/(auth)/login');
  };

  const slide = SLIDES[i];
  return (
    <Screen dark scroll={false} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Image source={require('@/assets/images/app-logo.png')} style={styles.logo} />
        {!last && <Button size="md" variant="ghostDark" label={t('onboarding.skip')} onPress={finish} style={{ paddingHorizontal: 0 }} />}
      </View>
      <View style={styles.middle}>
        {i === 0 ? (
          <Image source={require('@/assets/images/onboarding-visual.png')} style={styles.visual} resizeMode="contain" />
        ) : (
          <View style={styles.iconCircle}><Icon name={slide.icon} size={56} color={colors.ink} /></View>
        )}
      </View>
      <Text color={colors.onDark} weight="bold" style={{ fontSize: 40, lineHeight: 44, letterSpacing: -1.2 }}>{t(slide.title)}</Text>
      <Text color={colors.onDarkMuted} style={{ marginTop: space.md, fontSize: 18, lineHeight: 26 }}>{t(slide.text)}</Text>
      <View style={styles.dots}>
        {SLIDES.map((s, n) => <View key={s.title} style={[styles.dot, n === i && styles.dotOn]} />)}
      </View>
      <Button size="xl" variant="light" label={last ? t('onboarding.start') : t('onboarding.next')} icon={last ? undefined : 'arrow-right'}
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
