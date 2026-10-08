import React from 'react';
import { FlaggedScreen } from '@/components/coming-soon';

// Not connected to the backend yet: hidden (config/features.ts → promotions).
export default function PromotionsScreen() {
  return <FlaggedScreen flag="promotions" title="Promotions" />;
}
