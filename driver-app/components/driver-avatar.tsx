import { Image } from 'expo-image';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, colors } from '@/design';
import { photoSource } from '@/services/api';

// The driver's photo in a circle, or their initials when there is none.
// The photo is on ImageKit, or fetched from the API with the driver's token.
export function DriverAvatar({ name, photoUrl, size = 48 }: { name?: string; photoUrl?: string | null; size?: number }) {
  const { token } = useAuth();
  if (!photoUrl || !token) return <Avatar name={name} size={size} />;
  return (
    <Image
      source={photoSource(photoUrl, token)}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft2 }}
      contentFit="cover"
      transition={150}
      accessibilityIgnoresInvertColors
    />
  );
}
