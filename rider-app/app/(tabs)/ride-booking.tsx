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
  ScrollView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import AppLogo from "../../components/app-logo";
import { useAuth } from "../../contexts/AuthContext";
import { ridesAPI, driversAPI } from "../../services/api";

type Coords = { latitude: number; longitude: number };

// Longest trip the app will price (the server rejects anything over 500 km).
const MAX_TRIP_KM = 200;

type Estimate = {
  fare: number;
  distanceKm: number;
  pickupCoords: Coords;
};

// Straight-line distance in km between two points (haversine formula).
function distanceKm(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Looks up a typed address with the phone's geocoder (no API key needed).
async function geocode(address: string): Promise<Coords | null> {
  try {
    const [first] = await Location.geocodeAsync(address);
    return first ? { latitude: first.latitude, longitude: first.longitude } : null;
  } catch {
    return null;
  }
}

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
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
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
      setNearbyDrivers((response.drivers ?? []) as Driver[]);
    } catch (error) {
      console.error("Failed to load nearby drivers:", error);
      setNearbyDrivers([]);
    }
  };

  const resetEstimate = () => {
    setEstimate(null);
    setBookingStep("input");
  };

  const handleEstimate = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter both pickup and dropoff locations.",
      );
      return;
    }
    if (!token) return;

    setEstimating(true);
    try {
      // Pickup falls back to the phone's GPS position if the address isn't found.
      const pickupCoords =
        (await geocode(pickup)) ??
        (location ? { latitude: location.latitude, longitude: location.longitude } : null);
      const dropoffCoords = await geocode(dropoff);
      if (!pickupCoords || !dropoffCoords) {
        Alert.alert(
          "Address not found",
          `We couldn't find ${!pickupCoords ? "the pickup" : "the dropoff"} address. Try adding the street or neighbourhood and city.`,
        );
        return;
      }

      const km = Math.max(0.1, Math.round(distanceKm(pickupCoords, dropoffCoords) * 100) / 100);
      if (__DEV__) console.log("[booking] geocoded", { pickupCoords, dropoffCoords, km });
      // A geocoder can match a name in another town or country; catch that
      // here instead of sending an impossible trip to the server.
      if (km > MAX_TRIP_KM) {
        Alert.alert(
          "Check the addresses",
          `These places are ${Math.round(km)} km apart. Add the neighbourhood and city to both addresses.`,
        );
        return;
      }
      const result = await ridesAPI.estimate(token, { distance: km, is_shared: isSharedRide });
      setEstimate({ fare: result.fare, distanceKm: km, pickupCoords });
      setBookingStep("confirmation");
    } catch (error) {
      Alert.alert(
        "Estimate failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setEstimating(false);
    }
  };

  const handleBookRide = () => {
    if (!user || !token) {
      Alert.alert("Authentication Required", "Please log in to book a ride.");
      return;
    }
    if (!estimate) return;

    if (walletBalance < estimate.fare) {
      Alert.alert(
        "Insufficient Balance",
        `This ride costs ${estimate.fare.toLocaleString()} FBU. Please top up your wallet.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top up", onPress: () => router.push("/(tabs)/wallet") },
        ],
      );
      return;
    }

    setConfirmationModalVisible(true);
  };

  const confirmBooking = async () => {
    if (!token || !user || !estimate) return;

    setIsBooking(true);
    try {
      await ridesAPI.bookRide(token, {
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        distance: estimate.distanceKm,
        is_shared: isSharedRide,
        max_co_riders: isSharedRide ? maxCoRiders : undefined,
        pickup_lat: estimate.pickupCoords.latitude,
        pickup_lng: estimate.pickupCoords.longitude,
      });
      setConfirmationModalVisible(false);
      resetEstimate();
      setPickup("");
      setDropoff("");
      // The active-ride screen shows "Finding a driver" and follows the ride.
      router.replace("/active-ride");
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

  const userLat = location ? location.latitude : -3.375;
  const userLng = location ? location.longitude : 29.36;

  return (
    // Scrollable: the fare card and Confirm Booking appear below the form.
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
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
        onChangeText={(v) => {
          setPickup(v);
          resetEstimate();
        }}
      />
      <TextInput
        style={styles.input}
        placeholder="Dropoff Location"
        value={dropoff}
        onChangeText={(v) => {
          setDropoff(v);
          resetEstimate();
        }}
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
            resetEstimate();
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
      <TouchableOpacity
        style={[styles.estimateButton, estimating && { opacity: 0.6 }]}
        onPress={handleEstimate}
        disabled={estimating}
      >
        <Text style={styles.estimateText}>
          {estimating ? "Estimating…" : "Estimate Fare"}
        </Text>
      </TouchableOpacity>

      {estimate && bookingStep === "confirmation" && (
        <View style={styles.confirmationSection}>
          <View style={styles.fareCard}>
            <Text style={styles.fareLabel}>Estimated Fare</Text>
            <Text style={styles.fareAmount}>{estimate.fare.toLocaleString()} FBU</Text>
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
              <Text style={styles.summaryValue}>
                ~{estimate.distanceKm.toFixed(1)} km (straight line)
              </Text>
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
            <Text style={styles.modalTitle}>Confirm booking</Text>

            {estimate && (
              <View style={styles.modalTripSummary}>
                <Text style={styles.modalFare}>
                  Total: {estimate.fare.toLocaleString()} FBU
                </Text>
                <Text style={styles.modalRoute}>
                  {pickup} → {dropoff}
                </Text>
                {isSharedRide && (
                  <Text style={styles.modalRoute}>
                    Shared ride with up to {maxCoRiders} co-rider(s)
                  </Text>
                )}
                <Text style={styles.modalRoute}>
                  The fare is held from your wallet and charged when the trip ends.
                </Text>
              </View>
            )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
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
