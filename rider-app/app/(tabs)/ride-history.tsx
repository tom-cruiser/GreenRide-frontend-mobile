import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import AppLogo from '../../components/app-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '../../contexts/AuthContext';
import { ridesAPI } from '../../services/api';

type HistoryItem = {
  id: string;
  type: 'Ride' | 'Top-Up';
  date: string;
  amount: string;
  from: string;
  to: string;
  driverName: string;
  distance: string;
  duration: string;
  rating: number | null;
  status: string;
  isShared?: boolean;
  shareLabel?: string;
};

const DATA: HistoryItem[] = [
  {
    id: '1',
    type: 'Ride',
    date: 'Jan 27, 2026',
    amount: '-3,500 FBU',
    from: 'Downtown',
    to: 'Airport',
    driverName: 'Jean Pierre',
    distance: '0.5 km',
    duration: '15 mins',
    rating: null,
    status: 'completed',
  },
  {
    id: '2',
    type: 'Ride',
    date: 'Jan 25, 2026',
    amount: '-7,000 FBU',
    from: 'Market',
    to: 'University',
    driverName: 'Marie Claire',
    distance: '1.0 km',
    duration: '20 mins',
    rating: 5,
    status: 'completed',
  },
  {
    id: '3',
    type: 'Top-Up',
    date: 'Jan 24, 2026',
    amount: '+10,000 FBU',
    from: '',
    to: '',
    driverName: '',
    distance: '',
    duration: '',
    rating: null,
    status: 'completed',
  },
];

type BackendRide = {
  id: string;
  pickup: string;
  dropoff: string;
  fare: number;
  distance: number;
  status: string;
  date: string;
  rating: number | null;
  is_shared: boolean;
  share: null | {
    groupId: number;
    status: string;
    ridersCount: number;
    maxRiders: number | null;
    coRiders: { id: number; name: string }[];
  };
};

export default function RideHistoryScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState<HistoryItem | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [rides, setRides] = useState<HistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const topUpItems = useMemo(() => DATA.filter((d) => d.type === 'Top-Up'), []);

  const fetchHistory = async () => {
    if (!token || !user) return;

    setLoadError(null);
    const res = await ridesAPI.getRideHistory(token, user.id);
    const backendRides = (res.rides ?? []) as BackendRide[];

    const mapped: HistoryItem[] = backendRides.map((r) => {
      const shareLabel = r.is_shared && r.share
        ? `Shared • ${r.share.ridersCount}/${r.share.maxRiders ?? r.share.ridersCount}`
        : undefined;

      return {
        id: r.id,
        type: 'Ride',
        date: new Date(r.date).toDateString(),
        amount: `-${Number(r.fare).toLocaleString()} FBU`,
        from: r.pickup,
        to: r.dropoff,
        driverName: r.status === 'completed' ? 'Driver' : 'Searching…',
        distance: `${Number(r.distance).toFixed(1)} km`,
        duration: '—',
        rating: r.rating,
        status: r.status,
        isShared: r.is_shared,
        shareLabel,
      };
    });

    setRides(mapped);
  };

  useEffect(() => {
    fetchHistory().catch((e) => {
      const message = e instanceof Error ? e.message : 'Failed to load ride history.';
      setLoadError(message);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  const handleRateRide = (ride: HistoryItem) => {
    setSelectedRide(ride);
    setRating(0);
    setFeedback('');
    setModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Please Rate', 'Please select a star rating before submitting.');
      return;
    }

    if (!token || !selectedRide) {
      Alert.alert('Error', 'Unable to submit rating right now.');
      return;
    }

    try {
      await ridesAPI.rateRide(token, selectedRide.id, rating, feedback || undefined);
      await fetchHistory();
      Alert.alert(
        'Thank You!',
        `Your ${rating}-star rating has been submitted. Thank you for your feedback!`,
        [{ text: 'OK', onPress: () => setModalVisible(false) }]
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to submit rating.';
      Alert.alert('Rating Failed', message);
    }
  };

  const renderStars = (currentRating: number, onPress?: (value: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onPress && onPress(star)}>
            <IconSymbol
              name={star <= currentRating ? 'star.fill' : 'star'}
              size={24}
              color={star <= currentRating ? '#FFD700' : '#ccc'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRideItem = ({ item }: { item: HistoryItem }) => {
    if (item.type === 'Top-Up') {
      return (
        <View style={styles.card}>
          <Image source={require('../../assets/images/app-logo.png')} style={styles.icon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rideType}>{item.type}</Text>
            <Text style={styles.rideDate}>{item.date}</Text>
          </View>
          <Text style={[styles.amount, { color: '#16A34A' }]}>{item.amount}</Text>
        </View>
      );
    }

    return (
      <View style={styles.rideCard}>
        <View style={styles.rideHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rideType}>{item.type}</Text>
            <Text style={styles.rideDate}>{item.date}</Text>
            <Text style={styles.rideRoute}>{item.from} → {item.to}</Text>
            {item.shareLabel ? <Text style={styles.sharedBadge}>{item.shareLabel}</Text> : null}
            <View style={styles.rideDetails}>
              <Text style={styles.rideDetailText}>Driver: {item.driverName}</Text>
              <Text style={styles.rideDetailText}>{item.distance} • {item.duration}</Text>
            </View>
          </View>
          <View style={styles.rideRight}>
            <Text style={styles.amount}>{item.amount}</Text>
            {item.rating != null ? (
              <View style={styles.existingRating}>
                {renderStars(item.rating)}
                <Text style={styles.ratingText}>You rated this ride</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => handleRateRide(item)}
              >
                <Text style={styles.rateButtonText}>Rate Ride</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.goBack} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.goBackText}>{'< Go Back'}</Text>
      </TouchableOpacity>
      <AppLogo size={60} />
      <Text style={styles.title}>Ride History</Text>

      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
      
      <FlatList
        data={[...rides, ...topUpItems]}
        keyExtractor={(item) => item.id}
        renderItem={renderRideItem}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={async () => {
          setIsRefreshing(true);
          try {
            await fetchHistory();
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to refresh.';
            setLoadError(message);
          } finally {
            setIsRefreshing(false);
          }
        }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Rating Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Your Ride</Text>
            {selectedRide && (
              <Text style={styles.modalSubtitle}>
                {selectedRide.from} → {selectedRide.to}
              </Text>
            )}
            
            <Text style={styles.ratingLabel}>How was your ride with {selectedRide?.driverName}?</Text>
            {renderStars(rating, setRating)}
            
            <TextInput
              style={styles.feedbackInput}
              placeholder="Share your feedback (optional)"
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitRating}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  goBack: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F6F6F6',
  },
  goBackText: {
    color: '#0B0B0B',
    fontWeight: '700',
    fontSize: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0B0B0B',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorText: {
    color: '#B91C1C',
    marginBottom: 10,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 1,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 1,
  },
  sharedBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    color: '#1B5E20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '800',
    fontSize: 12,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rideRight: {
    alignItems: 'flex-end',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  rideType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B0B0B',
  },
  rideDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  rideRoute: {
    fontSize: 14,
    color: '#111827',
    marginTop: 4,
    fontWeight: '600',
  },
  rideDetails: {
    marginTop: 4,
  },
  rideDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d32f2f',
  },
  rateButton: {
    backgroundColor: '#0B0B0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  existingRating: {
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0B0B0B',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#0B0B0B',
    marginBottom: 16,
    textAlign: 'center',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginTop: 16,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#0B0B0B',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
