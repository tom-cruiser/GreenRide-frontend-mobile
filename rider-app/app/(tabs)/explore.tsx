import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AppLogo from '../../components/app-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function MoreScreen() {
  const router = useRouter();

  const handleFeature = (feature: string) => {
    switch (feature) {
      case 'profile':
        router.push('/profile');
        break;
      case 'safety':
        router.push('/safety');
        break;
      case 'support':
        router.push('/support');
        break;
      case 'promotions':
        router.push('/promotions');
        break;
      case 'settings':
        router.push('/settings');
        break;
      default:
        Alert.alert('Coming Soon', `${feature} feature is under development`);
    }
  };

  const menuItems = [
    { title: 'Profile Management', icon: 'person.fill', feature: 'profile' },
    { title: 'Safety & Support', icon: 'shield.fill', feature: 'safety' },
    { title: 'Help Center', icon: 'questionmark.circle.fill', feature: 'support' },
    { title: 'Promotions', icon: 'gift.fill', feature: 'promotions' },
    { title: 'Settings', icon: 'gear', feature: 'settings' },
    { title: 'Notifications', icon: 'bell.fill', feature: 'notifications' },
    { title: 'Rate App', icon: 'star.fill', feature: 'rate' },
  ] as const;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <AppLogo size={60} />
        <Text style={styles.title}>More Options</Text>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleFeature(item.feature)}
          >
            <IconSymbol name={item.icon} size={24} color="#43a047" />
            <Text style={styles.menuText}>{item.title}</Text>
            <IconSymbol name="chevron.right" size={16} color="#888" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>GreenRider v1.0.0</Text>
        <Text style={styles.footerSubtext}>Eco-friendly rides for everyone</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#43a047',
    marginTop: 10,
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
});
