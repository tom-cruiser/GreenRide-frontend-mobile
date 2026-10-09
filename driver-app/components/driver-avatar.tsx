import { Image } from 'expo-image';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, colors } from '@/design';
import { apiUrl } from '@/services/api';

// The driver's photo in a circle, or their initials when there is none.
// Photos are private: fetched with the signed-in driver's token.
export function DriverAvatar({ name, photoUrl, size = 48 }: { name?: string; photoUrl?: string | null; size?: number }) {
  const { token } = useAuth();
  if (!photoUrl || !token) return <Avatar name={name} size={size} />;
  return (
    <Image
      source={{ uri: apiUrl(photoUrl), headers: { Authorization: `Bearer ${token}` } }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft2 }}
      contentFit="cover"
      transition={150}
      accessibilityIgnoresInvertColors
    />
  );
}
