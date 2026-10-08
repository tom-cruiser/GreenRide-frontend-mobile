import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from '@/design';

export default function OnboardingVisual() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/onboarding-visual.png')}
        style={styles.image}
        accessibilityLabel="Onboarding Visual"
      />
      <Text style={styles.text}>Welcome to Flow!
Experience seamless, eco-friendly rides with instant wallet payments.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  image: {
    width: 260,
    height: 260,
    marginBottom: 24,
    resizeMode: 'contain',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    color: '#111111',
    fontWeight: '600',
  },
});
