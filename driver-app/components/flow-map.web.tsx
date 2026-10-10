import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design';
import type { FlowMapProps } from './flow-map.types';

export type { FlowMapProps, LatLng, MapPin } from './flow-map.types';

export default function FlowMap({ style }: FlowMapProps) {
  return (
    <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text>Map preview is not available on web.</Text>
    </View>
  );
}
