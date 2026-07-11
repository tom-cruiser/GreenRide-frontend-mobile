import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/app-header';
import ProfileSummary from '../../components/profile-summary';
import SafetySupportBar from '../../components/safety-support-bar';
import EarningsSummary from '../../components/earnings-summary';
import RideStatusToggle from '../../components/ride-status-toggle';
import { useAuth } from '../../contexts/AuthContext';

export default function DriverDashboard() {
  const router = useRouter();
  const { user, token, walletBalance, updateWalletBalance } = useAuth();
  const [available, setAvailable] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (token) updateWalletBalance();
  }, [token, updateWalletBalance]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await updateWalletBalance();
    } finally {
      setRefreshing(false);
    }
  };

  const quickActions = [
    { label: 'Registration', route: '/registration-verification' },
    { label: 'Requests', route: '/ride-requests' },
    { label: 'Messages', route: '/messaging' },
    { label: 'Promotions', route: '/promotions' },
    { label: 'Analytics', route: '/analytics' },
    { label: 'Settings', route: '/settings' },
  ];

  return (
    <View style={styles.bg}>
      <AppHeader onNotificationsPress={() => router.push('/notifications')} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ProfileSummary
          name={user?.name}
          status={user?.role === 'driver' ? 'Verified driver' : 'Pending verification'}
          onProfilePress={() => router.push('/profile')}
        />
        <RideStatusToggle status={available} onToggle={() => setAvailable(!available)} />
        <EarningsSummary
          label="Wallet balance"
          today={walletBalance}
          onViewHistory={() => router.push('/wallet')}
        />
        <SafetySupportBar onEmergency={() => router.push('/safety')} onSupport={() => router.push('/support')} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Dashboard</Text>
          <Text style={styles.sectionSubtitle}>
            Live requests, earnings overview, status toggle, and operational shortcuts.
          </Text>
          <View style={styles.actionGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.actionCard}
                onPress={() => router.push(item.route as never)}>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Features Included</Text>
          <Text style={styles.featureItem}>1. Registration & verification workflow</Text>
          <Text style={styles.featureItem}>2. Driver dashboard with online/offline status</Text>
          <Text style={styles.featureItem}>3. Real-time ride request management</Text>
          <Text style={styles.featureItem}>4. Navigation map with pickup/drop flow</Text>
          <Text style={styles.featureItem}>5. Earnings tracker with commission and payouts</Text>
          <Text style={styles.featureItem}>6. In-app messaging and rider call actions</Text>
          <Text style={styles.featureItem}>7. Availability toggle</Text>
          <Text style={styles.featureItem}>8. Profile and document management</Text>
          <Text style={styles.featureItem}>9. Ride history with ratings</Text>
          <Text style={styles.featureItem}>10. Safety and incident reporting</Text>
          <Text style={styles.featureItem}>11. Support and help center</Text>
          <Text style={styles.featureItem}>12. Feedback and ratings</Text>
          <Text style={styles.featureItem}>13. Shared ride coordination</Text>
          <Text style={styles.featureItem}>14. Promotions and incentives</Text>
          <Text style={styles.featureItem}>15. Settings and preferences</Text>
          <Text style={styles.featureItem}>16. Analytics dashboard</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#e3f2fd',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: '#4b5563',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#a5d6a7',
  },
  actionLabel: {
    color: '#1b5e20',
    fontWeight: '700',
  },
  featureItem: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
});
