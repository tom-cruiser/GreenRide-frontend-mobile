import React from 'react';
import { FlaggedScreen } from '@/components/coming-soon';

// Not connected to the backend yet: hidden (config/features.ts → messaging).
export default function MessagingScreen() {
  return <FlaggedScreen flag="messaging" title="Messaging" />;
}
