import React from 'react';
import { Image, StyleSheet, type StyleProp, type ViewStyle, View } from 'react-native';

type AppLogoProps = {
  size?: number;
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function AppLogo({ size = 120, compact = false, containerStyle }: AppLogoProps) {
  return (
    <View style={[styles.container, !compact && styles.containerSpaced, containerStyle]}>
      <Image
        source={require('../assets/images/app-logo.png')}
        style={{ width: size, height: size, resizeMode: 'contain' }}
        accessibilityLabel="Flow logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSpaced: {
    marginVertical: 24,
  },
});
