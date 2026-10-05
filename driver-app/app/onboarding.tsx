import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DriverOnboarding() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Green Ride Driver</Text>
      <Text style={styles.subtitle}>Start earning with eco-friendly rides</Text>
      <TouchableOpacity
        style={styles.nextBtn}
        onPress={async () => {
          await AsyncStorage.setItem('driverHasOnboarded', 'true').catch(() => {});
          router.replace('/(auth)/login');
        }}
      >
        <Text style={styles.nextText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5fff7',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  nextBtn: {
    backgroundColor: '#43a047',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: 220,
    alignItems: 'center',
  },
  nextText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
