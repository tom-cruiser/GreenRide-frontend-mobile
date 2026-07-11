import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  Platform,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import AppLogo from "../../components/app-logo";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "../../contexts/AuthContext";
import { ridesAPI, driversAPI } from "../../services/api";

type Driver = {
  id: number;
  latitude: number;
  longitude: number;
  name?: string;
  rating?: number;
  eta?: string;
};

export default function RideBookingScreen() {
  const router = useRouter();
  const { user, token, walletBalance } = useAuth();
  const hasAndroidMapsKey =
    Platform.OS !== "android" ||
    Boolean(
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
        (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey,
    );
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [fare, setFare] = useState<string | null>(null);
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [bookingStep, setBookingStep] = useState<
    "input" | "confirmation" | "booked"
  >("input");
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [isSharedRide, setIsSharedRide] = useState(false);
  const [maxCoRiders, setMaxCoRiders] = useState(1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location Permission",
            "Permission to access location was denied",
          );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;

        setLocation(loc.coords);
      } catch (error) {
        console.error("Location init failed:", error);
        Alert.alert(
          "Location Error",
          "Unable to get your current location. Please enable GPS and try again.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!location || !token) return;
    loadNearbyDrivers(location.latitude, location.longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, token]);

  const loadNearbyDrivers = async (lat: number, lng: number) => {
    try {
      const response = await driversAPI.getNearbyDrivers(token!, lat, lng);
      if (response.drivers) {
        setNearbyDrivers(response.drivers as Driver[]);
      }
    } catch (error) {
      console.error("Failed to load nearby drivers:", error);
      // Use dummy data as fallback
      setNearbyDrivers([
        {
          id: 1,
          latitude: lat + 0.001,
          longitude: lng + 0.001,
          name: "Jean Pierre",
          rating: 4.8,
          eta: "5 mins",
        },
        {
          id: 2,
          latitude: lat - 0.001,
          longitude: lng + 0.002,
          name: "Marie Claire",
          rating: 4.9,
          eta: "3 mins",
        },
      ]);
    }
  };

  const handleEstimate = () => {
    if (!pickup || !dropoff) {
      Alert.alert(
        "Missing Information",
        "Please enter both pickup and dropoff locations.",
      );
      return;
    }

    // Simple distance calculation (in real app, use proper mapping service)
    const estimatedDistance = 1.0; // km
    const baseRate = 7000; // FBU per km
    const estimatedFare = Math.max(baseRate * estimatedDistance, 3500);
    const discountedFare = isSharedRide
      ? Math.floor(estimatedFare * 0.75)
      : estimatedFare;

    setFare(`${discountedFare.toLocaleString()} FBU`);
    setBookingStep("confirmation");
  };

  const handleBookRide = async () => {
    if (!user || !token) {
      Alert.alert("Authentication Required", "Please log in to book a ride.");
      return;
    }

    // Check wallet balance (very simplified)
    const fareAmount = isSharedRide ? 5250 : 7000;
    if (walletBalance < fareAmount) {
      Alert.alert(
        "Insufficient Balance",
        "Please top up your wallet to book this ride.",
      );
      return;
    }

    const nearestDriver = nearbyDrivers[0];
    if (!nearestDriver) {
      Alert.alert(
        "No Drivers Available",
        "No drivers are currently available in your area.",
      );
      return;
    }

    setSelectedDriver(nearestDriver);
    setConfirmationModalVisible(true);
  };

  const confirmBooking = async () => {
    if (!token || !user || !selectedDriver) return;

    setIsBooking(true);
    try {
      const rideData = {
        pickup,
        dropoff,
        distance: 1.0, // km
        rider_id: user.id,
        is_shared: isSharedRide,
        max_co_riders: isSharedRide ? maxCoRiders : undefined,
        pickup_lat: location?.latitude,
        pickup_lng: location?.longitude,
      };

      const response = await ridesAPI.bookRide(token, rideData);

      if (response.ride) {
        setConfirmationModalVisible(false);
        setBookingStep("booked");
        if (response.share?.groupId) {
          Alert.alert(
            "Shared Ride Requested",
            "We’re finding co-riders going your way. You can track the match status now.",
            [
              {
                text: "Track",
                onPress: () =>
                  router.push({
                    pathname: "/shared-ride",
                    params: { groupId: String(response.share.groupId) },
                  }),
              },
              { text: "Later", onPress: () => router.replace("/(tabs)") },
            ],
          );
        } else {
          Alert.alert(
            "Ride Booked!",
            `Your ride has been confirmed with ${selectedDriver.name}. They will arrive in ${selectedDriver.eta}.`,
            [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
          );
        }
      }
    } catch (error) {
      console.error("Booking failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to book the ride. Please try again.";
      Alert.alert("Booking Failed", message);
    } finally {
      setIsBooking(false);
    }
  };

  const handleDriverContact = () => {
    if (!selectedDriver) return;
    Alert.alert("Contact Driver", "Choose how to contact your driver:", [
      {
        text: "Call",
        onPress: () =>
          Alert.alert("Calling", `Calling ${selectedDriver.name}...`),
      },
      {
        text: "Message",
        onPress: () => Alert.alert("Messaging", "Opening in-app messaging..."),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const userLat = location ? location.latitude : -3.375;
  const userLng = location ? location.longitude : 29.36;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.goBack}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.goBackText}>{"< Go Back"}</Text>
      </TouchableOpacity>
      <AppLogo size={60} />
      <Text style={styles.title}>Book a Ride</Text>
      {/* Map with user and driver markers */}
      {hasAndroidMapsKey ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLat,
            longitude: userLng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          region={
            location
              ? {
                  latitude: userLat,
                  longitude: userLng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : undefined
          }
        >
          <Marker
            coordinate={{ latitude: userLat, longitude: userLng }}
            title="You"
            pinColor="#43a047"
          />
          {nearbyDrivers.map((driver) => (
            <Marker
              key={driver.id}
              coordinate={{
                latitude: driver.latitude,
                longitude: driver.longitude,
              }}
              title={driver.name || `Driver ${driver.id}`}
              pinColor="#1976d2"
            />
          ))}
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapFallback]}>
          <Text style={styles.mapFallbackTitle}>Map disabled in this build</Text>
          <Text style={styles.mapFallbackText}>
            Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to enable live Google Maps.
          </Text>
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Pickup Location"
        value={pickup}
        onChangeText={setPickup}
      />
      <TextInput
        style={styles.input}
        placeholder="Dropoff Location"
        value={dropoff}
        onChangeText={setDropoff}
      />

      <View style={styles.sharedRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sharedTitle}>Shared ride</Text>
          <Text style={styles.sharedSubtitle}>
            Pay less by matching nearby riders
          </Text>
        </View>
        <Switch
          value={isSharedRide}
          onValueChange={(v) => {
            setIsSharedRide(v);
            setFare(null);
            setBookingStep("input");
          }}
          trackColor={{ false: "#E5E7EB", true: "#BDECC0" }}
          thumbColor={isSharedRide ? "#43a047" : "#9CA3AF"}
        />
      </View>

      {isSharedRide && (
        <View style={styles.coRidersCard}>
          <Text style={styles.coRidersTitle}>Max co-riders</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[
                styles.stepperButton,
                maxCoRiders <= 1 && styles.stepperDisabled,
              ]}
              onPress={() => setMaxCoRiders((v) => Math.max(1, v - 1))}
              disabled={maxCoRiders <= 1}
            >
              <Text style={styles.stepperButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{maxCoRiders}</Text>
            <TouchableOpacity
              style={[
                styles.stepperButton,
                maxCoRiders >= 3 && styles.stepperDisabled,
              ]}
              onPress={() => setMaxCoRiders((v) => Math.min(3, v + 1))}
              disabled={maxCoRiders >= 3}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.coRidersHint}>
            You + up to {maxCoRiders} co-rider(s)
          </Text>
        </View>
      )}
      <TouchableOpacity style={styles.estimateButton} onPress={handleEstimate}>
        <Text style={styles.estimateText}>Estimate Fare</Text>
      </TouchableOpacity>

      {fare && bookingStep === "confirmation" && (
        <View style={styles.confirmationSection}>
          <View style={styles.fareCard}>
            <Text style={styles.fareLabel}>Estimated Fare</Text>
            <Text style={styles.fareAmount}>{fare}</Text>
          </View>

          <View style={styles.tripSummary}>
            <Text style={styles.summaryTitle}>Trip Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>From:</Text>
              <Text style={styles.summaryValue}>{pickup}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>To:</Text>
              <Text style={styles.summaryValue}>{dropoff}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Distance:</Text>
              <Text style={styles.summaryValue}>~1.0 km</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Time:</Text>
              <Text style={styles.summaryValue}>15-20 mins</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.bookButton} onPress={handleBookRide}>
            <Text style={styles.bookText}>Confirm Booking</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={confirmationModalVisible}
        onRequestClose={() => setConfirmationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Driver Found!</Text>

            {selectedDriver && (
              <View style={styles.driverInfo}>
                <View style={styles.driverAvatar}>
                  <IconSymbol name="person.fill" size={32} color="#0B0B0B" />
                </View>
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{selectedDriver.name}</Text>
                  <View style={styles.ratingContainer}>
                    <IconSymbol name="star.fill" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {selectedDriver.rating}
                    </Text>
                  </View>
                  <Text style={styles.etaText}>
                    Arrives in {selectedDriver.eta}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalTripSummary}>
              <Text style={styles.modalFare}>Total: {fare}</Text>
              <Text style={styles.modalRoute}>
                {pickup} → {dropoff}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleDriverContact}
            >
              <IconSymbol name="message.fill" size={20} color="#0B0B0B" />
              <Text style={styles.contactButtonText}>Contact Driver</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setConfirmationModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmBooking}
                disabled={isBooking}
              >
                <Text style={styles.confirmButtonText}>
                  {isBooking ? "Booking..." : "Confirm"}
                </Text>
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    padding: 24,
    justifyContent: "center",
  },
  map: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    marginBottom: 12,
  },
  mapFallback: {
    backgroundColor: "#eef3f8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  mapFallbackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  mapFallbackText: {
    fontSize: 13,
    color: "#4b5563",
    textAlign: "center",
  },
  goBack: {
    alignSelf: "flex-start",
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F6F6F6",
  },
  goBackText: {
    color: "#0B0B0B",
    fontWeight: "700",
    fontSize: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0B0B0B",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sharedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F6F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  sharedTitle: {
    color: "#0B0B0B",
    fontWeight: "800",
    fontSize: 14,
  },
  sharedSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  coRidersCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  coRidersTitle: {
    color: "#111827",
    fontWeight: "800",
    marginBottom: 10,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperDisabled: {
    opacity: 0.5,
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  stepperValue: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  coRidersHint: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 8,
  },
  estimateButton: {
    backgroundColor: "#0B0B0B",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },
  estimateText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  confirmationSection: {
    width: "100%",
  },
  fareCard: {
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 1,
  },
  fareLabel: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "600",
  },
  fareAmount: {
    fontSize: 22,
    color: "#0B0B0B",
    fontWeight: "bold",
  },
  tripSummary: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0B0B0B",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0B0B0B",
  },
  bookButton: {
    backgroundColor: "#0B0B0B",
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 60,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  bookText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: "center",
    minWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0B0B0B",
    marginBottom: 20,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F6F6F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0B0B0B",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  etaText: {
    fontSize: 14,
    color: "#0B0B0B",
    fontWeight: "600",
    marginTop: 4,
  },
  modalTripSummary: {
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    width: "100%",
  },
  modalFare: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0B0B0B",
  },
  modalRoute: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F6F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  contactButtonText: {
    color: "#0B0B0B",
    fontWeight: "600",
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#111827",
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#0B0B0B",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
