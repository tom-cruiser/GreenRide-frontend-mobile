import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

type Props = {
  name?: string;
  vehicle?: string;
  status?: string;
  onProfilePress?: () => void;
};

export default function ProfileSummary({
  name = 'Driver',
  vehicle = 'Vehicle not set',
  status = 'Pending verification',
  onProfilePress,
}: Props) {
  return (
    <TouchableOpacity style={styles.profileBox} onPress={onProfilePress}>
      <Image source={require('../assets/images/icon.png')} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.vehicle}>Vehicle: {vehicle}</Text>
        <Text style={styles.status}>{status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  info: { flex: 1 },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111111',
  },
  vehicle: {
    fontSize: 15,
    color: '#555',
    marginTop: 2,
  },
  status: {
    fontSize: 14,
    color: '#111111',
    marginTop: 2,
    fontWeight: '600',
  },
});
