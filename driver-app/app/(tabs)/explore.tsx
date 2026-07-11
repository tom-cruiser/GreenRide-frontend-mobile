import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

type FeatureLink = {
  title: string;
  subtitle: string;
  route: string;
};

const FEATURE_LINKS: FeatureLink[] = [
  { title: 'Registration & Verification', subtitle: 'Upload ID and vehicle documents', route: '/registration-verification' },
  { title: 'Ride Requests', subtitle: 'Accept or decline live requests', route: '/ride-requests' },
  { title: 'Navigation', subtitle: 'GPS and route view', route: '/(tabs)/map' },
  { title: 'Earnings Tracker', subtitle: 'Commission, payouts and summaries', route: '/wallet' },
  { title: 'Messaging', subtitle: 'Chat and call riders securely', route: '/messaging' },
  { title: 'Profile Management', subtitle: 'Edit account and vehicle profile', route: '/profile' },
  { title: 'Ride History & Ratings', subtitle: 'Past trips and passenger feedback', route: '/ride-history' },
  { title: 'Safety Center', subtitle: 'Emergency and incident report', route: '/safety' },
  { title: 'Support Center', subtitle: 'FAQs and support channel', route: '/support' },
  { title: 'Shared Ride Options', subtitle: 'Coordinate co-passenger trips', route: '/shared-rides' },
  { title: 'Promotions', subtitle: 'Bonuses and incentives', route: '/promotions' },
  { title: 'Settings', subtitle: 'Notifications and ride preferences', route: '/settings' },
  { title: 'Analytics Dashboard', subtitle: 'Performance and habits insights', route: '/analytics' },
  { title: 'Feedback & Ratings', subtitle: 'Your ratings and rider reviews', route: '/feedback-ratings' },
];

export default function OperationsCenterScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Driver Operations Center</Text>
      <Text style={styles.subtitle}>Every requested feature is available from this screen.</Text>

      {FEATURE_LINKS.map((item) => (
        <TouchableOpacity
          key={item.title}
          style={styles.card}
          onPress={() => router.push(item.route as never)}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.footerSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#e3f2fd',
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0d47a1',
    marginBottom: 6,
  },
  subtitle: {
    color: '#334155',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#475569',
  },
  footerSpace: {
    height: 20,
  },
});
