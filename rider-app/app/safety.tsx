import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { Text } from '@/design';
import { useRouter } from 'expo-router';
import AppLogo from '../components/app-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SafetyScreen() {
  const router = useRouter();
  const [emergencySharing, setEmergencySharing] = useState(false);

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'This will call emergency services immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', onPress: () => Linking.openURL('tel:911') },
      ]
    );
  };

  const handleShareRide = () => {
    setEmergencySharing(!emergencySharing);
    Alert.alert(
      'Ride Sharing',
      emergencySharing 
        ? 'Ride sharing has been disabled' 
        : 'Ride details will be shared with your emergency contacts'
    );
  };

  const safetyFeatures = [
    {
      title: 'Emergency Call',
      description: 'Quick access to emergency services',
      icon: 'phone.fill',
      action: handleEmergencyCall,
      color: '#d32f2f',
    },
    {
      title: 'Share Ride Details',
      description: 'Share your ride with trusted contacts',
      icon: 'person.2.fill',
      action: handleShareRide,
      color: '#1976d2',
    },
    {
      title: 'Report Safety Issue',
      description: 'Report any safety concerns during your ride',
      icon: 'exclamationmark.triangle.fill',
      action: () => Alert.alert('Safety Report', 'Safety reporting feature coming soon'),
      color: '#ff9800',
    },
    {
      title: 'Safety Tips',
      description: 'View safety guidelines and best practices',
      icon: 'lightbulb.fill',
      action: () => Alert.alert('Safety Tips', 'Safety tips feature coming soon'),
      color: '#111111',
    },
  ] as const;

  const emergencyContacts = [
    { name: 'Police', number: '911', description: 'Local police emergency line' },
    { name: 'Medical Emergency', number: '911', description: 'Medical emergency services' },
    { name: 'Flow support', number: '+257 79 000 000', description: '24/7 customer support' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.goBack} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#d32f2f" />
          <Text style={styles.goBackText}>Back</Text>
        </TouchableOpacity>
        <AppLogo size={40} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Safety & Support</Text>
        <Text style={styles.subtitle}>Your safety is our top priority</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Ride Sharing Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            Emergency contacts sharing: {emergencySharing ? 'ON' : 'OFF'}
          </Text>
          <View style={[styles.statusIndicator, { backgroundColor: emergencySharing ? '#111111' : '#888' }]} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Features</Text>
        {safetyFeatures.map((feature, index) => (
          <TouchableOpacity
            key={index}
            style={styles.featureItem}
            onPress={feature.action}
          >
            <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
              <IconSymbol name={feature.icon} size={24} color={feature.color} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#888" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        {emergencyContacts.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={styles.contactItem}
            onPress={() => Linking.openURL(`tel:${contact.number}`)}
          >
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactDescription}>{contact.description}</Text>
            </View>
            <Text style={styles.contactNumber}>{contact.number}</Text>
            <IconSymbol name="phone.fill" size={20} color="#111111" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>Need Additional Help?</Text>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => Alert.alert('Help Center', 'Opening help center...')}
        >
          <Text style={styles.helpButtonText}>Visit Help Center</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  goBack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goBackText: {
    color: '#d32f2f',
    fontWeight: '600',
    marginLeft: 4,
  },
  titleContainer: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#111111',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contactNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginRight: 8,
  },
  helpSection: {
    alignItems: 'center',
    padding: 20,
  },
  helpTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  helpButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});