
import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export default function AppHeader({ onNotificationsPress }) {
  return (
    <View style={styles.header}>
      <Image source={require('../assets/images/icon.png')} style={styles.logo} />
      <TouchableOpacity onPress={onNotificationsPress} style={styles.notificationsBtn}>
        <Feather name="bell" size={28} color="#111111" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 12,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  notificationsBtn: {
    padding: 8,
  },
  bellIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
});
