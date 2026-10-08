import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/design';

type WebMapViewProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export default function MapView({ style, children }: WebMapViewProps) {
  return (
    <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text>Map preview is not available on web.</Text>
      {children}
    </View>
  );
}

export function Marker() {
  return null;
}
