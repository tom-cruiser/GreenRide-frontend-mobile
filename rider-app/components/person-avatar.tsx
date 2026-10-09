import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, colors } from '@/design';
import { apiUrl, type FriendsPerson } from '@/services/api';

// A rider's photo in a circle (or filling its box with `fill`), or their
// initials when there is none. Photos
// are private: fetched with the signed-in rider's token.
export function PersonAvatar({ person, size = 48, ring = false, fill = false }: {
  person: Pick<FriendsPerson, 'initials' | 'photoUrl'>; size?: number; ring?: boolean | 'space'; fill?: boolean;
}) {
  const { token } = useAuth();
  // ring: a black ring (friends); 'space': the same room, invisible, so rows line up.
  const frame = ring ? { padding: 3, borderRadius: (size + 10) / 2, borderWidth: 2, borderColor: ring === 'space' ? 'transparent' : colors.ink } : null;
  return (
    <View style={fill ? { flex: 1 } : frame}>
      {person.photoUrl && token ? (
        <Image
          source={{ uri: apiUrl(person.photoUrl), headers: { Authorization: `Bearer ${token}` } }}
          style={fill ? { width: '100%', height: '100%' } : { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft2 }}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Avatar name={person.initials.split('').join(' ')} size={size} />
      )}
    </View>
  );
}
