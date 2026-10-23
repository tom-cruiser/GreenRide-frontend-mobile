import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, colors, Icon, radius, Screen, space, Text } from '@/design';
import { useT, type Locale } from '@/i18n';

const LANGUAGES: { code: Locale; name: string }[] = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
];

// Asked once, on first launch, before anything else. The phone's language is
// preselected. Written in both languages since none is chosen yet.
export default function LanguageScreen() {
  const { locale, setLocale } = useT();
  const [pick, setPick] = useState<Locale>(locale);

  // Saving the choice is enough: the root layout then moves on.
  const confirm = () => setLocale(pick);

  return (
    <Screen dark scroll={false} edges={['top', 'bottom']}>
      <Image source={require('@/assets/images/app-logo.png')} style={styles.logo} />
      <View style={styles.middle}>
        <Icon name="globe" size={40} color={colors.onDark} />
        <Text color={colors.onDark} weight="bold" style={styles.title}>Choisissez votre langue</Text>
        <Text color={colors.onDarkMuted} style={styles.subtitle}>Choose your language</Text>
        <View style={styles.options}>
          {LANGUAGES.map(({ code, name }) => {
            const on = pick === code;
            return (
              <Pressable key={code} onPress={() => setPick(code)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={[styles.option, on && styles.optionOn]}>
                <Text weight="semibold" style={{ fontSize: 20, flex: 1 }} color={on ? colors.ink : colors.onDark}>{name}</Text>
                {on && <Icon name="check" size={22} color={colors.ink} />}
              </Pressable>
            );
          })}
        </View>
      </View>
      <Button size="xl" variant="light" label={pick === 'fr' ? 'Continuer' : 'Continue'} icon="arrow-right" onPress={confirm} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 48, height: 48, borderRadius: 24 },
  middle: { flex: 1, justifyContent: 'center' },
  title: { marginTop: space.xl, fontSize: 34, lineHeight: 40, letterSpacing: -1 },
  subtitle: { marginTop: space.sm, fontSize: 20 },
  options: { marginTop: space.xxl, gap: space.md },
  option: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: space.xl, paddingHorizontal: space.xl,
    borderRadius: radius.xl, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  optionOn: { backgroundColor: colors.onDark, borderColor: colors.onDark },
});
