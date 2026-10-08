import React from 'react';
import { FlaggedScreen } from '@/components/coming-soon';

// Not connected to the backend yet: hidden (config/features.ts → safety).
export default function SafetyScreen() {
  return <FlaggedScreen flag="safety" title="Safety" />;
}
