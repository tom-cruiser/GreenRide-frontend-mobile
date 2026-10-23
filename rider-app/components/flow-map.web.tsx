import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design';
import { useT } from '@/i18n';
import type { FlowMapProps } from './flow-map.types';

export type { FlowMapProps, LatLng, MapPin } from './flow-map.types';

export default function FlowMap({ style }: FlowMapProps) {
  const { t } = useT();
  return (
    <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text>{t('map.web')}</Text>
    </View>
  );
}
